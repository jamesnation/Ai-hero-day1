import type { Message } from "ai";
import {
  createDataStreamResponse,
  appendResponseMessages,
} from "ai";
import { auth } from "../../../server/auth/index.ts";
import { db } from "../../../server/db/index";
import { userRequests, users } from "../../../server/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { upsertChat } from "../../../server/db/queries";
import { Langfuse } from "langfuse";
import { env } from "~/env";
import { checkRateLimit, recordRateLimit } from "../../../server/redis/rate-limit";
import { streamFromDeepSearch } from "../../../deep-search";
import type { OurMessageAnnotation } from "../../../types";

export const maxDuration = 60;

function generateChatTitle(messages: Message[]): string {
  // Use the first user message as the title, truncated to 50 chars
  const firstUserMsg = messages.find((m) => m.role === "user");
  if (!firstUserMsg) return "New Chat";
  const text = Array.isArray(firstUserMsg.content)
    ? firstUserMsg.content.join(" ")
    : String(firstUserMsg.content);
  return text.slice(0, 50) || "New Chat";
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- Global rate limiting logic ---
  // This rate limit applies to ALL requests, not just per user.
  // For testing, allow only 1 request per 5 seconds globally.
  const globalRateLimitConfig = {
    maxRequests: 1,
    windowMs: 5000, // 5 seconds
    keyPrefix: "global_llm",
    maxRetries: 3,
  };
  // Check the global rate limit before any expensive operations
  const globalRate = await checkRateLimit(globalRateLimitConfig);
  if (!globalRate.allowed) {
    // If not allowed, wait for the window to reset (retry)
    const isAllowed = await globalRate.retry();
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: "Global rate limit exceeded. Please try again soon." }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
  // Record the global request (increment the counter)
  await recordRateLimit(globalRateLimitConfig);
  // --- End global rate limiting logic ---

  // --- Per-user daily rate limiting logic ---
  const userId = session.user.id;
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  const isAdmin = user?.isAdmin ?? false;
  const DAILY_LIMIT = 50;
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  const countResult = await db
    .select({ count: sql`count(*)::int` })
    .from(userRequests)
    .where(
      and(
        eq(userRequests.userId, userId),
        gte(userRequests.requestedAt, startOfDay),
        lte(userRequests.requestedAt, endOfDay)
      )
    );
  const count = typeof countResult?.[0]?.count === "number" ? countResult[0].count : 0;
  if (!isAdmin && count >= DAILY_LIMIT) {
    return new Response(JSON.stringify({ error: "Too many requests. Please try again tomorrow." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }
  await db.insert(userRequests).values({ userId });
  // --- End per-user daily rate limiting logic ---

  const body = (await request.json()) as {
    messages: Array<Message>;
    chatId: string;
    isNewChat: boolean;
  };

  const { messages, chatId, isNewChat } = body;
  const currentChatId = chatId;
  let createdNewChat = false;

  // If isNewChat, create a new chat in the DB with the user's message
  if (isNewChat) {
    createdNewChat = true;
    await upsertChat({
      userId,
      chatId: currentChatId,
      title: generateChatTitle(messages),
      messages: messages.map((msg) => ({
        ...msg,
        parts: Array.isArray(msg.parts) ? msg.parts : [],
        content: msg.content,
      })),
    });
  }

  // --- Langfuse integration ---
  const langfuse = new Langfuse({
    environment: env.NODE_ENV,
  });
  const trace = langfuse.trace({
    sessionId: currentChatId,
    name: "chat",
    userId: userId,
  });
  // --- End Langfuse integration ---

  return createDataStreamResponse({
    execute: async (dataStream) => {
      // Collect annotations in memory
      const annotations: OurMessageAnnotation[] = [];

      // Wait for the result from the new agent loop system
      const result = await streamFromDeepSearch({
        messages,
        onFinish: async ({ response }) => {
          const responseMessages = response.messages;
          const updatedMessages = appendResponseMessages({
            messages,
            responseMessages,
          });

          // Add annotations to the last message (the AI response)
          const lastMessage = updatedMessages[updatedMessages.length - 1];
          if (lastMessage && annotations.length > 0) {
            lastMessage.annotations = annotations;
          }

          await upsertChat({
            userId,
            chatId: currentChatId,
            title: generateChatTitle(updatedMessages),
            messages: updatedMessages.map((msg) => ({
              ...msg,
              parts: Array.isArray(msg.parts) ? msg.parts : [],
              content: msg.content,
            })),
          });
          // --- Langfuse flush ---
          await langfuse.flushAsync();
          // --- End Langfuse flush ---
        },
        telemetry: {
          isEnabled: true,
          functionId: `agent`,
          metadata: {
            langfuseTraceId: trace.id,
          },
        },
        writeMessageAnnotation: (annotation: OurMessageAnnotation) => {
          // Save the annotation in-memory
          annotations.push(annotation);
          // Send it to the client
          dataStream.writeMessageAnnotation(annotation);
        },
      });
      
      // Once the result is ready, merge it into the data stream
      result.mergeIntoDataStream(dataStream);
      
      if (!chatId) {
        // After creating the new chat, stream the new chatId to the frontend
        dataStream.writeData({
          type: "NEW_CHAT_CREATED",
          chatId: currentChatId,
        });
      }
    },
    onError: (e) => {
      console.error(e);
      return "Oops, an error occured!";
    },
  });
} 
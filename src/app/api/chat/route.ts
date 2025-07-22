import type { Message } from "ai";
import {
  streamText,
  createDataStreamResponse,
  appendResponseMessages,
} from "ai";
import { model } from "../../../models";
import { auth } from "../../../server/auth/index.ts";
import { searchSerper } from "../../../serper";
import { z } from "zod";
import { db } from "../../../server/db/index";
import { userRequests, users } from "../../../server/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { upsertChat } from "../../../server/db/queries";

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

  // --- Rate limiting logic ---
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
  // --- End rate limiting logic ---

  const body = (await request.json()) as {
    messages: Array<Message>;
    chatId: string;
    isNewChat: boolean;
  };

  let { messages, chatId, isNewChat } = body;
  let currentChatId = chatId;
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

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const result = streamText({
        model,
        messages,
        tools: {
          searchWeb: {
            parameters: z.object({
              query: z.string().describe("The query to search the web for"),
            }),
            execute: async ({ query }, { abortSignal }) => {
              const results = await searchSerper(
                { q: query, num: 10 },
                abortSignal,
              );
              return results.organic.map((result) => ({
                title: result.title,
                link: result.link,
                snippet: result.snippet,
              }));
            },
          },
        },
        system: `You are an AI assistant with access to a web search tool. For any question that requires up-to-date or factual information, always use the searchWeb tool to find answers. Always cite your sources with inline markdown links (e.g., [source](url)) in your responses. If you use information from a search result, include the link to the source in your answer.`,
        maxSteps: 10,
        // Save the chat and messages after the stream finishes
        async onFinish({ response }) {
          const responseMessages = response.messages;
          const updatedMessages = appendResponseMessages({
            messages,
            responseMessages,
          });
          await upsertChat({
            userId,
            chatId: currentChatId!,
            title: generateChatTitle(updatedMessages),
            messages: updatedMessages.map((msg) => ({
              ...msg,
              parts: Array.isArray(msg.parts) ? msg.parts : [],
              content: msg.content,
            })),
          });
        },
      });
      result.mergeIntoDataStream(dataStream);
      if (!chatId) {
        // After creating the new chat, stream the new chatId to the frontend
        dataStream.writeData({
          type: "NEW_CHAT_CREATED",
          chatId: currentChatId!,
        });
      }
    },
    onError: (e) => {
      console.error(e);
      return "Oops, an error occured!";
    },
  });
} 
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
import { Langfuse } from "langfuse";
import { env } from "~/env";
import { bulkCrawlWebsites } from "../../../server/scraper";
import { checkRateLimit, recordRateLimit } from "../../../server/redis/rate-limit";

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
      const now = new Date();
      const currentDateTime = now.toISOString().replace("T", " ").slice(0, 16) + " UTC";
      const result = streamText({
        model,
        messages,
        experimental_telemetry: {
          isEnabled: true,
          functionId: `agent`,
          metadata: {
            langfuseTraceId: trace.id,
          },
        },
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
                date: result.date || null, // Add date if available
              }));
            },
          },
          scrapePages: {
            parameters: z.object({
              urls: z.array(z.string()).describe("A list of URLs to scrape for full page content."),
            }),
            execute: async ({ urls }) => {
              // Manual URL validation
              const validUrls = urls.filter((u: string) => {
                try {
                  new URL(u);
                  return true;
                } catch {
                  return false;
                }
              });
              if (validUrls.length !== urls.length) {
                return {
                  success: false,
                  error: `One or more provided URLs are invalid. Only valid URLs will be scraped.`,
                  results: validUrls.map((url: string) => ({ url, result: { success: false, error: "Invalid URL" } })),
                };
              }
              const result = await bulkCrawlWebsites({ urls: validUrls });
              return result;
            },
          },
        },
        system: [
          `The current date and time is: ${currentDateTime}. Use this information to interpret queries about 'today', 'now', or 'recent' events. When a user asks for up-to-date information, always use the current date to interpret their request and prefer the most recent sources.`,
          "You are an AI assistant with access to real-time web data through two powerful tools:",
          "",
          "- searchWeb: Use this tool to search the web for up-to-date or factual information. Always cite your sources with inline markdown links (e.g., [source](url)) in your responses.",
          "- scrapePages: Always use this tool to extract the full text content of web pages, not just snippets. For any query that requires information from the web, you must use the scrapePages tool. When answering, scrape four to six URLs per query, choosing a diverse set of reputable and relevant sources. This tool will return the main content of each page in markdown format, or an error if the page cannot be crawled.",
          "",
          "If you use information from a search result or a scraped page, always include the link to the source in your answer.",
          "",
          "You are an advanced AI assistant with access to real-time web data. Your answers should be as accurate, current, and well-sourced as possible.",
        ].join("\n"),
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
          // --- Langfuse flush ---
          await langfuse.flushAsync();
          // --- End Langfuse flush ---
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
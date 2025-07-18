import type { Message } from "ai";
import {
  streamText,
  createDataStreamResponse,
} from "ai";
import { model } from "../../../models";
import { auth } from "../../../server/auth/index.ts";
import { searchSerper } from "../../../serper";
import { z } from "zod";
// --- Added imports for rate limiting ---
import { db } from "../../../server/db/index";
import { userRequests, users } from "../../../server/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const maxDuration = 60;

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
  // Fetch user from DB to get isAdmin status
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  const isAdmin = user?.isAdmin ?? false;
  const DAILY_LIMIT = 50;

  // Get start and end of today (UTC)
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  // Count requests made today
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
  // Safely extract count, defaulting to 0 if undefined or not a number
  const count = typeof countResult?.[0]?.count === "number" ? countResult[0].count : 0;

  if (!isAdmin && count >= DAILY_LIMIT) {
    return new Response(JSON.stringify({ error: "Too many requests. Please try again tomorrow." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Record the new request
  await db.insert(userRequests).values({ userId });
  // --- End rate limiting logic ---

  const body = (await request.json()) as {
    messages: Array<Message>;
  };

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const { messages } = body;

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
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (e) => {
      console.error(e);
      return "Oops, an error occured!";
    },
  });
} 
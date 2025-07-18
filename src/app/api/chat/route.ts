import type { Message } from "ai";
import {
  streamText,
  createDataStreamResponse,
} from "ai";
import { model } from "../../../models";
import { auth } from "../../../server/auth/index.ts";
import { searchSerper } from "../../../serper";
import { z } from "zod";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
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
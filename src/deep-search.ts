import {
  streamText,
  type Message,
  type TelemetrySettings,
  type ToolExecutionOptions,
} from "ai";
import { model } from "./models";
import { searchSerper } from "./serper";
import { z } from "zod";
import { bulkCrawlWebsites } from "./server/scraper";

// System prompt and tools copied from the API route
function getSystemPrompt(currentDateTime: string) {
  return [
    `The current date and time is: ${currentDateTime}. Use this information to interpret queries about 'today', 'now', or 'recent' events. When a user asks for up-to-date information, always use the current date to interpret their request and prefer the most recent sources.`,
    "You are an AI assistant with access to real-time web data through two powerful tools:",
    "",
    "- searchWeb: Use this tool to search the web for up-to-date or factual information. Always cite your sources with inline markdown links (e.g., [source](url)) in your responses.",
    "- scrapePages: Always use this tool to extract the full text content of web pages, not just snippets. For any query that requires information from the web, you must use the scrapePages tool. When answering, scrape four to six URLs per query, choosing a diverse set of reputable and relevant sources. This tool will return the main content of each page in markdown format, or an error if the page cannot be crawled.",
    "",
    "If you use information from a search result or a scraped page, always include the link to the source in your answer.",
    "",
    "You are an advanced AI assistant with access to real-time web data. Your answers should be as accurate, current, and well-sourced as possible.",
  ].join("\n");
}

const tools = {
  searchWeb: {
    parameters: z.object({
      query: z.string().describe("The query to search the web for"),
    }),
    execute: async (
      { query }: { query: string },
      options?: ToolExecutionOptions
    ) => {
      const results = await searchSerper(
        { q: query, num: 10 },
        options?.abortSignal,
      );
      return results.organic.map((result) => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet,
        date: result.date || null,
      }));
    },
  },
  scrapePages: {
    parameters: z.object({
      urls: z.array(z.string()).describe("A list of URLs to scrape for full page content."),
    }),
    execute: async (
      { urls }: { urls: string[] },
      _options?: ToolExecutionOptions
    ) => {
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
};

export const streamFromDeepSearch = (opts: {
  messages: Message[];
  onFinish: Parameters<typeof streamText>[0]["onFinish"];
  telemetry: TelemetrySettings;
}) => {
  const now = new Date();
  const currentDateTime = now.toISOString().replace("T", " ").slice(0, 16) + " UTC";
  return streamText({
    model,
    messages: opts.messages,
    maxSteps: 10,
    system: getSystemPrompt(currentDateTime),
    tools: tools as any,
    onFinish: opts.onFinish,
    experimental_telemetry: opts.telemetry,
  });
};

export async function askDeepSearch(messages: Message[]) {
  const result = streamFromDeepSearch({
    messages,
    onFinish: () => {},
    telemetry: { isEnabled: false },
  });
  await result.consumeStream();
  return await result.text;
} 
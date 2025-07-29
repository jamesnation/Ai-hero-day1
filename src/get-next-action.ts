import { generateObject } from "ai";
import { z } from "zod";
import { model } from "./models";
import type { SystemContext } from "./system-context";

/**
 * Represents a search action - searching the web for more information
 */
export interface SearchAction {
  type: "search";
  query: string;
}

/**
 * Represents a scrape action - scraping URLs for content
 */
export interface ScrapeAction {
  type: "scrape";
  urls: string[];
}

/**
 * Represents an answer action - providing the final answer to the user
 */
export interface AnswerAction {
  type: "answer";
}

/**
 * Union type representing all possible actions
 */
export type Action = SearchAction | ScrapeAction | AnswerAction;

/**
 * Zod schema for structured output from the LLM
 * Uses a single object with optional fields instead of z.union for better LLM compatibility
 */
export const actionSchema = z.object({
  type: z
    .enum(["search", "scrape", "answer"])
    .describe(
      `The type of action to take.
      - 'search': Search the web for more information.
      - 'scrape': Scrape a URL.
      - 'answer': Answer the user's question and complete the loop.`,
    ),
  query: z
    .string()
    .describe(
      "The query to search for. Required if type is 'search'.",
    )
    .optional(),
  urls: z
    .array(z.string())
    .describe(
      "The URLs to scrape. Required if type is 'scrape'.",
    )
    .optional(),
});

/**
 * Determines the next action to take in the deep search system
 * Uses structured output to ensure the LLM returns a valid action
 * 
 * @param context - The current system context with query and scrape history
 * @returns A structured action object that can be executed
 */
export const getNextAction = async (
  context: SystemContext,
): Promise<Action> => {
  const userQuestion = context.getUserQuestion();
  
  const result = await generateObject({
    model,
    schema: actionSchema,
    prompt: `
You are an AI assistant that can search the web, scrape URLs, or provide answers to user questions.

Your goal is to help answer the user's question: "${userQuestion}"

You have access to the following tools:
- search: Search the web for more information
- scrape: Scrape URLs to get detailed content
- answer: Provide the final answer to the user's question

Here is your current context:

${context.getFormattedContext()}

Based on the context above, decide what action to take next:

1. If you need more information to answer the question, use "search" with a relevant query
2. If you have search results but need to read the full content of URLs, use "scrape" with the URLs
3. If you have enough information to answer the question, use "answer"

Choose the most appropriate action and provide the required parameters.
`,
  });

  // Validate the result and return the appropriate action type
  const action = result.object;
  
  switch (action.type) {
    case "search":
      if (!action.query) {
        throw new Error("Search action requires a query parameter");
      }
      return { type: "search", query: action.query };
    
    case "scrape":
      if (!action.urls || action.urls.length === 0) {
        throw new Error("Scrape action requires at least one URL");
      }
      return { type: "scrape", urls: action.urls };
    
    case "answer":
      return { type: "answer" };
    
    default:
      throw new Error(`Invalid action type: ${(action as any).type}`);
  }
}; 
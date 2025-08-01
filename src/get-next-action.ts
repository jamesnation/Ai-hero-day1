import { generateObject } from "ai";
import { z } from "zod";
import { model } from "./models";
import type { SystemContext } from "./system-context";

/**
 * Represents a search action - searching the web for information
 */
export interface SearchAction {
  type: "search";
  query: string;
  title: string;
  reasoning: string;
}

/**
 * Represents an answer action - providing the final answer to the user
 */
export interface AnswerAction {
  type: "answer";
  title: string;
  reasoning: string;
}

/**
 * Union type representing all possible actions
 */
export type Action = SearchAction | AnswerAction;

/**
 * Zod schema for structured output from the LLM
 * Uses a single object with optional fields instead of z.union for better LLM compatibility
 */
export const actionSchema = z.object({
  type: z
    .enum(["search", "answer"])
    .describe(
      `The type of action to take.
      - 'search': Search the web for more information and automatically scrape the results.
      - 'answer': Answer the user's question and complete the loop.`,
    ),
  title: z
    .string()
    .describe(
      "The title of the action, to be displayed in the UI. Be extremely concise. 'Searching Saka's injury history', 'Checking HMRC industrial action', 'Comparing toaster ovens'",
    ),
  reasoning: z
    .string()
    .describe("The reason you chose this step."),
  query: z
    .string()
    .describe(
      "The query to search for. Required if type is 'search'.",
    )
    .optional(),
});

/**
 * Determines the next action to take in the deep search system
 * Uses structured output to ensure the LLM returns a valid action
 * 
 * @param context - The current system context with search history
 * @param langfuseTraceId - Optional Langfuse trace ID for telemetry
 * @returns A structured action object that can be executed
 */
export const getNextAction = async (
  context: SystemContext,
  langfuseTraceId?: string,
): Promise<Action> => {
  const userQuestion = context.getUserQuestion();
  
  const result = await generateObject({
    model,
    schema: actionSchema,
    prompt: `
You are an AI assistant that can search the web or provide answers to user questions.

Your goal is to help answer the user's question: "${userQuestion}"

You have access to the following tools:
- search: Search the web for more information and automatically scrape the content of the results
- answer: Provide the final answer to the user's question

Here is your current context:

${context.getFormattedContext()}

Based on the context above, decide what action to take next:

1. If you need more information to answer the question, use "search" with a relevant query. The search will automatically scrape the content of the results.
2. If you have enough information to answer the question, use "answer"

Choose the most appropriate action and provide the required parameters.
`,
    experimental_telemetry: langfuseTraceId ? {
      isEnabled: true,
      functionId: "get-next-action",
      metadata: {
        langfuseTraceId,
      },
    } : undefined,
  });

  // Validate the result and return the appropriate action type
  const action = result.object;
  
  switch (action.type) {
    case "search":
      if (!action.query) {
        throw new Error("Search action requires a query parameter");
      }
      return { 
        type: "search", 
        query: action.query,
        title: action.title,
        reasoning: action.reasoning
      };
    
    case "answer":
      return { 
        type: "answer",
        title: action.title,
        reasoning: action.reasoning
      };
    
    default:
      throw new Error(`Invalid action type: ${(action as { type: string }).type}`);
  }
}; 
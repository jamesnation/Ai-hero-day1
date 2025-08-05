import { generateObject } from "ai";
import { z } from "zod";
import { model } from "./models";
import type { SystemContext } from "./system-context";

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
export type Action = AnswerAction;

/**
 * Zod schema for structured output from the LLM
 */
export const actionSchema = z.object({
  type: z
    .enum(["answer"])
    .describe(
      `The type of action to take.
      - 'answer': We have enough information to answer the question.`,
    ),
  title: z
    .string()
    .describe(
      "The title of the action, to be displayed in the UI. Be extremely concise. 'Analyzing search results', 'Providing final answer'",
    ),
  reasoning: z
    .string()
    .describe("The reason you chose this step."),
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
You are an AI assistant that evaluates whether enough information has been gathered to answer a user's question.

Your goal is to help answer the user's question: "${userQuestion}"

You have access to the following action:
- answer: Indicate that we have enough information to provide a comprehensive answer to the user's question.

Here is your current context:

${context.getFormattedContext()}

Based on the context above, decide whether we have enough information to answer the question:

1. If you have enough information to provide a thorough answer, use "answer"
2. If you need more information, the system will automatically continue searching (no action needed)

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
  
  // Since we only have "answer" as an option, we can simplify this
  return { 
    type: "answer",
    title: action.title,
    reasoning: action.reasoning
  };
}; 
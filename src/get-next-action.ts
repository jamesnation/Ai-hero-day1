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
  feedback?: string; // Optional since feedback is only needed when continuing to search
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
  feedback: z
    .string()
    .optional()
    .describe("Detailed feedback about what information is available, what's missing, and specific guidance for the next search iteration. Only provide this if you're continuing to search - not needed when answering the question."),
});

/**
 * Determines the next action to take in the deep search system
 * Uses structured output to ensure the LLM returns a valid action with optional feedback
 * 
 * @param context - The current system context with search history
 * @param langfuseTraceId - Optional Langfuse trace ID for telemetry
 * @returns A structured action object that can be executed with optional feedback
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
You are a research query optimizer. Your task is to analyze search results against the original research goal and either decide to answer the question or to search for more information.

PROCESS:
1. Identify ALL information explicitly requested in the original research goal
2. Analyze what specific information has been successfully retrieved in the search results
3. Identify ALL information gaps between what was requested and what was found
4. For entity-specific gaps: Create targeted queries for each missing attribute of identified entities
5. For general knowledge gaps: Create focused queries to find the missing conceptual information

Your goal is to help answer the user's question: "${userQuestion}"

You have access to the following action:
- answer: Indicate that we have enough information to provide a comprehensive answer to the user's question.

Here is your current context:

${context.getFormattedContext()}

Based on the context above, decide whether we have enough information to answer the question:

1. If you have enough information to provide a thorough answer, use "answer"
2. If you need more information, the system will automatically continue searching (no action needed)

IMPORTANT: 
- If you choose "answer" (we have enough information), you do NOT need to provide feedback since we're done searching
- If you would continue searching (but the system handles this automatically), you would provide detailed feedback about:
  - What specific information has been successfully gathered
  - What information gaps remain
  - Specific guidance for the next search iteration (what to search for, how to refine queries)
  - Any patterns or insights you've noticed in the search results

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

  // Report token usage
  if (result.usage) {
    context.reportUsage("get-next-action", result.usage);
  }

  // Validate the result and return the appropriate action type
  const action = result.object;
  
  // Since we only have "answer" as an option, we can simplify this
  return { 
    type: "answer",
    title: action.title,
    reasoning: action.reasoning,
    feedback: action.feedback // This will be undefined when answering, which is correct
  };
}; 
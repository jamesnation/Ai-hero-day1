import { generateObject } from "ai";
import { z } from "zod";
import { model } from "./models";
import type { SystemContext } from "./system-context";

/**
 * Represents a research plan with queries
 */
export interface ResearchPlan {
  plan: string;
  queries: string[];
}

/**
 * Zod schema for structured output from the LLM
 */
export const queryRewriterSchema = z.object({
  plan: z
    .string()
    .describe(
      "A detailed research plan that outlines the logical progression of information needed to answer the question. Include analysis of the question, identification of key concepts, and strategic approach.",
    ),
  queries: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe(
      "A numbered list of 3-5 sequential search queries that progress logically from foundational to specific information. Each query should be specific and focused, written in natural language without Boolean operators.",
    ),
});

/**
 * Generates a research plan and search queries using chain-of-thought prompting
 * Now incorporates feedback from previous evaluations to improve search strategy
 * 
 * @param context - The current system context with search history and feedback
 * @param langfuseTraceId - Optional Langfuse trace ID for telemetry
 * @returns A research plan with queries
 */
export const queryRewriter = async (
  context: SystemContext,
  langfuseTraceId?: string,
): Promise<ResearchPlan> => {
  const userQuestion = context.getUserQuestion();
  const lastFeedback = context.getLastFeedback();
  
  const result = await generateObject({
    model,
    schema: queryRewriterSchema,
    prompt: `
You are a strategic research planner with expertise in breaking down complex questions into logical search steps. Your primary role is to create a detailed research plan before generating any search queries.

First, analyze the question thoroughly:
- Break down the core components and key concepts
- Identify any implicit assumptions or context needed
- Consider what foundational knowledge might be required
- Think about potential information gaps that need filling

Then, develop a strategic research plan that:
- Outlines the logical progression of information needed
- Identifies dependencies between different pieces of information
- Considers multiple angles or perspectives that might be relevant
- Anticipates potential dead-ends or areas needing clarification

IMPORTANT: If there is previous evaluation feedback available, use it to inform your strategy:
- Address specific information gaps mentioned in the feedback
- Refine your approach based on what was already found
- Focus on the most promising search directions identified
- Avoid repeating searches that didn't yield useful results

Finally, translate this plan into a numbered list of 3-5 sequential search queries that:

- Are specific and focused (avoid broad queries that return general information)
- Are written in natural language without Boolean operators (no AND/OR)
- Progress logically from foundational to specific information
- Build upon each other in a meaningful way
- Address any specific gaps or guidance from previous feedback

Remember that initial queries can be exploratory - they help establish baseline information or verify assumptions before proceeding to more targeted searches. Each query should serve a specific purpose in your overall research plan.

User Question: "${userQuestion}"

Current Context:
${context.getFormattedContext()}

${lastFeedback ? `Previous Evaluation Feedback: ${lastFeedback}` : ""}

Based on the current context, previous feedback (if any), and the user's question, create a research plan and generate the next set of search queries.
`,
    experimental_telemetry: langfuseTraceId ? {
      isEnabled: true,
      functionId: "query-rewriter",
      metadata: {
        langfuseTraceId,
      },
    } : undefined,
  });

  return result.object;
}; 
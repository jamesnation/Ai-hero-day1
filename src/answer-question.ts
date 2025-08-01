import { streamText, type StreamTextResult, type StreamTextOnFinishCallback } from "ai";
import { model } from "./models";
import type { SystemContext } from "./system-context";

/**
 * Options for the answerQuestion function
 */
interface AnswerOptions {
  isFinal: boolean;
}

/**
 * Generates an answer to the user's question based on the search context
 * 
 * @param context - The system context with all search history
 * @param options - Options including isFinal flag
 * @param langfuseTraceId - Optional Langfuse trace ID for telemetry
 * @param onFinish - Optional callback to run when the stream finishes
 * @returns A StreamTextResult containing the generated answer
 */
export const answerQuestion = async (
  context: SystemContext,
  options: AnswerOptions,
  langfuseTraceId?: string,
  onFinish?: StreamTextOnFinishCallback<{}>,
): Promise<StreamTextResult<{}, string>> => {
  const { isFinal } = options;
  const userQuestion = context.getUserQuestion();
  
  const systemPrompt = [
    "You are an expert estimator of collectibles values with extensive knowledge of antiques, memorabilia, trading cards, coins, stamps, and other valuable items.",
    "",
    "Your task is to provide concise estimates of collectibles values based on the search results provided.",
    "",
    "Guidelines:",
    "- Provide clear, concise value estimates for the collectible in question",
    "- Use information from the search results to support your estimates",
    "- Cite your sources using markdown links when possible",
    "- Be accurate and factual in your assessments",
    "- If information is conflicting, acknowledge the different perspectives and explain why",
    "- Consider factors like condition, rarity, market demand, and recent sales data",
    "- Provide a range estimate when appropriate (e.g., '$500-800' or '$1,200-1,500')",
    "- Mention any significant factors that could affect the value",
    "",
    isFinal 
      ? "⚠️ IMPORTANT: You may not have complete information to provide a precise estimate. Make your best effort with the available information and clearly state any limitations or gaps in your knowledge that could affect the accuracy of your estimate."
      : "You have gathered sufficient information to provide a reliable value estimate.",
    "",
    "User Question:",
    userQuestion,
    "",
    "Search Context:",
    context.getFormattedContext(),
  ].join("\n");

  return streamText({
    model,
    messages: [{ role: 'user', content: userQuestion }],
    system: systemPrompt,
    maxTokens: 2000, // Limit response length
    onFinish, // Pass the onFinish callback
    experimental_telemetry: langfuseTraceId ? {
      isEnabled: true,
      functionId: isFinal ? "answer-question-final" : "answer-question",
      metadata: {
        langfuseTraceId,
      },
    } : undefined,
  });
}; 
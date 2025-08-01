import { streamText, type StreamTextResult } from "ai";
import { model } from "./models";
import type { SystemContext } from "./system-context";

/**
 * Options for the answerQuestion function
 */
interface AnswerOptions {
  isFinal: boolean;
}

/**
 * Generates an answer to the user's question based on the search and scrape context
 * 
 * @param context - The system context with all search and scrape history
 * @param options - Options including isFinal flag
 * @returns A StreamTextResult containing the generated answer
 */
export const answerQuestion = async (
  context: SystemContext,
  options: AnswerOptions,
): Promise<StreamTextResult<{}, string>> => {
  const { isFinal } = options;
  const userQuestion = context.getUserQuestion();
  
  const systemPrompt = [
    "You are an AI assistant that provides comprehensive, well-sourced answers to user questions.",
    "",
    "Your task is to answer the user's question based on the search results and scraped content provided.",
    "",
    "Guidelines:",
    "- Provide a comprehensive answer that directly addresses the user's question",
    "- Use information from the search results and scraped content",
    "- Cite your sources using markdown links when possible",
    "- Be accurate and factual",
    "- If information is conflicting, acknowledge the different perspectives",
    "",
    isFinal 
      ? "⚠️ IMPORTANT: You may not have complete information to answer this question fully. Make your best effort with the available information and clearly state any limitations or gaps in your knowledge."
      : "You have gathered sufficient information to provide a comprehensive answer.",
    "",
    "User Question:",
    userQuestion,
    "",
    "Search and Scrape Context:",
    context.getFormattedContext(),
  ].join("\n");

  return streamText({
    model,
    messages: [{ role: 'user', content: userQuestion }],
    system: systemPrompt,
    maxTokens: 2000, // Limit response length
  });
}; 
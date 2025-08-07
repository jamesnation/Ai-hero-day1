import { generateText } from "ai";
import type { Message } from "ai";
import { summarizationModel } from "./models";
import { cacheWithRedis } from "./server/redis/redis";
import type { SystemContext } from "./system-context";

/**
 * Interface for the metadata from search results
 */
interface SearchMetadata {
  date: string;
  title: string;
  url: string;
  snippet: string;
}

/**
 * Summarizes the content of a scraped URL using AI
 * 
 * @param conversationHistory - The conversation history for context
 * @param scrapedContent - The raw scraped content to summarize
 * @param metadata - The search result metadata (date, title, url, snippet)
 * @param query - The original search query that led to this result
 * @param langfuseTraceId - Optional Langfuse trace ID for telemetry
 * @returns A summarized version of the content
 */
const summarizeURLInternal = async (
  conversationHistory: Message[],
  scrapedContent: string,
  metadata: SearchMetadata,
  query: string,
  langfuseTraceId?: string,
  context?: SystemContext,
): Promise<string> => {
  // Format conversation history for context
  const conversationContext = conversationHistory.length > 0
    ? conversationHistory
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n\n")
    : "No previous conversation.";

  const systemPrompt = `You are a research extraction specialist. Given a research topic and raw web content, create a thoroughly detailed synthesis as a cohesive narrative that flows naturally between key concepts.

Extract the most valuable information related to the research topic, including relevant facts, statistics, methodologies, claims, and contextual information. Preserve technical terminology and domain-specific language from the source material.

Structure your synthesis as a coherent document with natural transitions between ideas. Begin with an introduction that captures the core thesis and purpose of the source material. Develop the narrative by weaving together key findings and their supporting details, ensuring each concept flows logically to the next.

Integrate specific metrics, dates, and quantitative information within their proper context. Explore how concepts interconnect within the source material, highlighting meaningful relationships between ideas. Acknowledge limitations by noting where information related to aspects of the research topic may be missing or incomplete.

Important guidelines:
- Maintain original data context (e.g., "2024 study of 150 patients" rather than generic "recent study")
- Preserve the integrity of information by keeping details anchored to their original context
- Create a cohesive narrative rather than disconnected bullet points or lists
- Use paragraph breaks only when transitioning between major themes

Critical Reminder: If content lacks a specific aspect of the research topic, clearly state that in the synthesis, and you should NEVER make up information and NEVER rely on external knowledge.`;

  const userPrompt = `Research Topic: "${query}"

Conversation Context:
${conversationContext}

Source Information:
- Title: ${metadata.title}
- URL: ${metadata.url}
- Date: ${metadata.date}
- Snippet: ${metadata.snippet}

Raw Content:
${scrapedContent}

Please provide a comprehensive synthesis of the above content as it relates to the research topic.`;

  const result = await generateText({
    model: summarizationModel,
    system: systemPrompt,
    prompt: userPrompt,
    maxTokens: 2000, // Limit summary length
    experimental_telemetry: langfuseTraceId ? {
      isEnabled: true,
      functionId: "summarize-url",
      metadata: {
        langfuseTraceId,
        url: metadata.url,
        query,
      },
    } : undefined,
  });

  // Report token usage if context is provided
  if (context && result.usage) {
    context.reportUsage("summarize-url", result.usage);
  }

  return result.text;
};

/**
 * Cached version of summarizeURLInternal with Redis caching
 * Uses the URL and query as cache key components
 */
export const summarizeURL = cacheWithRedis(
  "summarize-url",
  summarizeURLInternal,
); 
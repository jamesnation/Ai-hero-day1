import { SystemContext } from "./system-context";
import { getNextAction, type Action } from "./get-next-action";
import { searchSerper } from "./serper";
import { bulkCrawlWebsites } from "./server/scraper";
import { answerQuestion } from "./answer-question";
import { streamText, type StreamTextResult } from "ai";
import { model } from "./models";
import type { OurMessageAnnotation } from "./types";

/**
 * Converts an Action to a SerializableAction for annotations
 */
const convertActionToSerializable = (action: Action): OurMessageAnnotation["action"] => {
  const base = {
    type: action.type,
    title: action.title,
    reasoning: action.reasoning,
  };

  switch (action.type) {
    case "search":
      return {
        ...base,
        query: action.query,
      };
    case "scrape":
      return {
        ...base,
        urls: action.urls,
      };
    case "answer":
      return base;
  }
};

/**
 * Executes a search action by querying the web
 * Reuses the existing searchWeb tool implementation
 */
const searchWeb = async (query: string) => {
  const results = await searchSerper(
    { q: query, num: 5 }, // Limit to 5 results for efficiency
    new AbortController().signal,
  );

  return {
    query,
    results: results.organic.map((result) => ({
      date: (result.date ?? new Date().toISOString().split('T')[0]) as string,
      title: result.title,
      url: result.link,
      snippet: result.snippet,
    })),
  };
};

/**
 * Executes a scrape action by crawling URLs
 * Reuses the existing scrapePages tool implementation
 */
const scrapeUrl = async (urls: string[]) => {
  // Manual URL validation (copied from existing implementation)
  const validUrls = urls.filter((u: string) => {
    try {
      new URL(u);
      return true;
    } catch {
      return false;
    }
  });

  if (validUrls.length !== urls.length) {
    // Return empty array for invalid URLs to maintain type consistency
    return [];
  }

  const result = await bulkCrawlWebsites({ urls: validUrls });
  
  return result.results.map((result) => ({
    url: result.url,
    result: result.result.success ? result.result.data : `Error: ${result.result.error}`,
  }));
};

/**
 * Main agent loop that orchestrates the search, scrape, and answer workflow
 * Follows the pseudocode structure provided
 * 
 * @param userQuestion - The original question from the user
 * @param writeMessageAnnotation - Function to send progress annotations back to the user
 * @param langfuseTraceId - Optional Langfuse trace ID for telemetry
 * @returns A promise that resolves to a StreamTextResult
 */
export const runAgentLoop = async (
  userQuestion: string,
  writeMessageAnnotation?: (annotation: OurMessageAnnotation) => void,
  langfuseTraceId?: string
): Promise<StreamTextResult<{}, string>> => {
  // A persistent container for the state of our system
  const ctx = new SystemContext(userQuestion);
  
  console.log(`🚀 Starting agent loop for: "${userQuestion}"`);
  
  try {
    // A loop that continues until we have an answer or we've taken 10 actions
    while (!ctx.shouldStop()) {
      console.log(`\n📋 Step ${ctx.getCurrentStep() + 1}:`);
      
      // We choose the next action based on the state of our system
      const nextAction = await getNextAction(ctx, langfuseTraceId);
      
      console.log(`🤖 LLM chose action: ${nextAction.type}`);
      
      // Send progress information back to the user if writeMessageAnnotation is provided
      if (writeMessageAnnotation) {
        writeMessageAnnotation({
          type: "NEW_ACTION",
          action: convertActionToSerializable(nextAction),
        } satisfies OurMessageAnnotation);
      }
      
      // We execute the action and update the state of our system
      if (nextAction.type === "search") {
        console.log(`🔍 Searching for: "${nextAction.query}"`);
        
        const result = await searchWeb(nextAction.query);
        ctx.reportQueries([result]);
        
        console.log(`✅ Found ${result.results.length} search results`);
        
      } else if (nextAction.type === "scrape") {
        console.log(`🌐 Scraping ${nextAction.urls.length} URLs`);
        
        const result = await scrapeUrl(nextAction.urls);
        ctx.reportScrapes(result);
        
        console.log(`✅ Successfully scraped ${result.length} URLs`);
        
      } else if (nextAction.type === "answer") {
        console.log(`💡 Generating answer...`);
        
        // We increment the step counter before answering
        ctx.incrementStep();
        
        // Return the answer as a stream
        return await answerQuestion(ctx, { isFinal: false }, langfuseTraceId);
      }
      
      // We increment the step counter
      ctx.incrementStep();
    }
    
    // If we've taken 10 actions and still don't have an answer,
    // we ask the LLM to give its best attempt at an answer
    console.log(`⚠️ Reached step limit, generating final answer...`);
    
    return await answerQuestion(ctx, { isFinal: true }, langfuseTraceId);
    
  } catch (error) {
    console.error(`❌ Error in agent loop:`, error);
    
    const errorMessage = `Sorry, I encountered an error while processing your question: "${userQuestion}". Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    return streamText({
      model,
      messages: [{ role: 'user', content: userQuestion }],
      system: "You are a helpful assistant. Provide the answer exactly as given.",
      prompt: errorMessage,
      experimental_telemetry: langfuseTraceId ? {
        isEnabled: true,
        functionId: "agent-loop-error-handler",
        metadata: {
          langfuseTraceId,
        },
      } : undefined,
    });
  }
}; 
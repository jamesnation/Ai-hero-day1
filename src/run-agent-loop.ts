import { SystemContext } from "./system-context";
import { getNextAction, type Action } from "./get-next-action";
import { searchSerper } from "./serper";
import { bulkCrawlWebsites } from "./server/scraper";
import { answerQuestion } from "./answer-question";
import { streamText, type StreamTextResult, type Message, type StreamTextOnFinishCallback } from "ai";
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
    case "answer":
      return base;
  }
};

/**
 * Executes a search action by querying the web and automatically scraping the results
 * Combines search and scrape functionality into a single operation
 */
const searchWeb = async (query: string) => {
  // Search for results with fewer results (3 instead of 5) to reduce context window usage
  const results = await searchSerper(
    { q: query, num: 3 },
    new AbortController().signal,
  );

  // Extract URLs from search results
  const urls = results.organic.map((result) => result.link);

  // Scrape all URLs in parallel
  const scrapeResult = await bulkCrawlWebsites({ urls });

  // Combine search results with scraped content
  const combinedResults = results.organic.map((result, index) => {
    const scrapedData = scrapeResult.results[index];
    const scrapedContent = scrapedData?.result.success 
      ? scrapedData.result.data 
      : `Error: ${scrapedData?.result.success === false ? scrapedData.result.error : 'Unknown error'}`;

    return {
      date: (result.date ?? new Date().toISOString().split('T')[0]) as string,
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      scrapedContent,
    };
  });

  return {
    query,
    results: combinedResults,
  };
};

/**
 * Main agent loop that orchestrates the search and answer workflow
 * Follows the pseudocode structure provided
 * 
 * @param userQuestion - The original question from the user
 * @param writeMessageAnnotation - Function to send progress annotations back to the user
 * @param langfuseTraceId - Optional Langfuse trace ID for telemetry
 * @param conversationHistory - The conversation history for context
 * @param onFinish - Optional callback to run when the stream finishes
 * @returns A promise that resolves to a StreamTextResult
 */
export const runAgentLoop = async (
  userQuestion: string,
  writeMessageAnnotation?: (annotation: OurMessageAnnotation) => void,
  langfuseTraceId?: string,
  conversationHistory: Message[] = [],
  onFinish?: StreamTextOnFinishCallback<{}>,
): Promise<StreamTextResult<{}, string>> => {
  // A persistent container for the state of our system
  const ctx = new SystemContext(userQuestion, conversationHistory);
  
  console.log(`🚀 Starting agent loop for: "${userQuestion}"`);
  console.log(`📝 Conversation history: ${conversationHistory.length} messages`);
  
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
        ctx.reportSearch(result);
        
        console.log(`✅ Found ${result.results.length} search results with scraped content`);
        
      } else if (nextAction.type === "answer") {
        console.log(`💡 Generating answer...`);
        
        // We increment the step counter before answering
        ctx.incrementStep();
        
        // Return the answer as a stream
        return await answerQuestion(ctx, { isFinal: false }, langfuseTraceId, onFinish);
      }
      
      // We increment the step counter
      ctx.incrementStep();
    }
    
    // If we've taken 10 actions and still don't have an answer,
    // we ask the LLM to give its best attempt at an answer
    console.log(`⚠️ Reached step limit, generating final answer...`);
    
    return await answerQuestion(ctx, { isFinal: true }, langfuseTraceId, onFinish);
    
  } catch (error) {
    console.error(`❌ Error in agent loop:`, error);
    
    const errorMessage = `Sorry, I encountered an error while processing your question: "${userQuestion}". Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    return streamText({
      model,
      messages: [{ role: 'user', content: userQuestion }],
      system: "You are a helpful assistant. Provide the answer exactly as given.",
      prompt: errorMessage,
      onFinish, // Pass the onFinish callback
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
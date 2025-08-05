import { SystemContext } from "./system-context";
import { getNextAction, type Action } from "./get-next-action";
import { queryRewriter } from "./query-rewriter";
import { searchSerper } from "./serper";
import { bulkCrawlWebsites } from "./server/scraper";
import { answerQuestion } from "./answer-question";
import { summarizeURL } from "./summarize-url";
import { streamText, type StreamTextResult, type Message, type StreamTextOnFinishCallback } from "ai";
import { model } from "./models";
import type { OurMessageAnnotation } from "./types";

/**
 * Converts an Action to a SerializableAction for annotations
 */
const convertActionToSerializable = (action: Action): OurMessageAnnotation["action"] => {
  return {
    type: action.type,
    title: action.title,
    reasoning: action.reasoning,
  };
};

/**
 * Executes a search action by querying the web and automatically scraping the results
 * Combines search and scrape functionality into a single operation with summarization
 */
const searchWeb = async (
  query: string,
  conversationHistory: Message[] = [],
  langfuseTraceId?: string,
) => {
  // Search for results with a balanced number to optimize for summarization
  const results = await searchSerper(
    { q: query, num: 5 },
    new AbortController().signal,
  );

  // Extract URLs from search results
  const urls = results.organic.map((result) => result.link);

  // Scrape all URLs in parallel
  const scrapeResult = await bulkCrawlWebsites({ urls });

  // Combine search results with scraped content and prepare for summarization
  const combinedResults = results.organic.map((result, index) => {
    const scrapedData = scrapeResult.results[index];
    const scrapedContent = scrapedData?.result.success 
      ? scrapedData.result.data 
      : `Error: ${scrapedData?.result.success === false ? scrapedData.result.error! : 'Unknown error'}`;

    return {
      date: (result.date ?? new Date().toISOString().split('T')[0]) as string,
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      scrapedContent,
    };
  });

  // Summarize all URLs in parallel
  console.log(`📝 Summarizing ${combinedResults.length} URLs...`);
  const summaryPromises = combinedResults.map(async (result) => {
    try {
      const summary = await summarizeURL(
        conversationHistory,
        result.scrapedContent,
        {
          date: result.date,
          title: result.title,
          url: result.url,
          snippet: result.snippet,
        },
        query,
        langfuseTraceId,
      );
      return { ...result, summary };
    } catch (error) {
      console.error(`❌ Failed to summarize ${result.url}:`, error);
      // Fallback to using scraped content as summary if summarization fails
      return { ...result, summary: result.scrapedContent };
    }
  });

  const resultsWithSummaries = await Promise.all(summaryPromises);
  console.log(`✅ Successfully summarized ${resultsWithSummaries.length} URLs`);

  return {
    query,
    results: resultsWithSummaries,
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
      
      // 1. Always run the query rewriter first
      console.log(`📝 Generating research plan and queries...`);
      const researchPlan = await queryRewriter(ctx, langfuseTraceId);
      console.log(`📋 Research Plan: ${researchPlan.plan}`);
      console.log(`🔍 Generated ${researchPlan.queries.length} queries`);
      
      // Send progress information for query rewriting
      if (writeMessageAnnotation) {
        writeMessageAnnotation({
          type: "NEW_ACTION",
          action: {
            type: "answer",
            title: `Planning research strategy (${researchPlan.queries.length} queries)`,
            reasoning: `Generated research plan: ${researchPlan.plan.substring(0, 100)}...`,
          },
        } satisfies OurMessageAnnotation);
      }
      
      // 2. Always search based on the queries
      console.log(`🚀 Executing ${researchPlan.queries.length} searches in parallel...`);
      const searchPromises = researchPlan.queries.map(async (query) => {
        console.log(`🔍 Searching for: "${query}"`);
        return await searchWeb(query, conversationHistory, langfuseTraceId);
      });
      
      const searchResults = await Promise.all(searchPromises);
      
      // 3. Always save results to context
      for (const result of searchResults) {
        ctx.reportSearch(result);
      }
      console.log(`✅ Completed ${searchResults.length} searches with summaries`);
      
      // Send progress information for search completion
      if (writeMessageAnnotation) {
        writeMessageAnnotation({
          type: "NEW_ACTION",
          action: {
            type: "answer",
            title: `Completed ${searchResults.length} searches`,
            reasoning: `Found and summarized ${searchResults.length} search results with relevant information.`,
          },
        } satisfies OurMessageAnnotation);
      }
      
      // 4. Decide whether to continue by calling getNextAction
      const nextAction = await getNextAction(ctx, langfuseTraceId);
      console.log(`🤖 LLM chose action: ${nextAction.type}`);
      
      // Send progress information back to the user if writeMessageAnnotation is provided
      if (writeMessageAnnotation) {
        writeMessageAnnotation({
          type: "NEW_ACTION",
          action: convertActionToSerializable(nextAction),
        } satisfies OurMessageAnnotation);
      }
      
      // Execute the action
      if (nextAction.type === "answer") {
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
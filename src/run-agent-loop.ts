import { SystemContext } from "./system-context";
import { getNextAction, type Action } from "./get-next-action";
import { queryRewriter } from "./query-rewriter";
import { searchSerper } from "./serper";
import { bulkCrawlWebsites } from "./server/scraper";
import { answerQuestion } from "./answer-question";
import { summarizeURL } from "./summarize-url";
import { streamText, type StreamTextResult, type Message, type StreamTextOnFinishCallback } from "ai";
import { model } from "./models";
import type { OurMessageAnnotation, SearchSource, SerializableAction } from "./types";
import { getFaviconUrl } from "./utils";

/**
 * Converts an Action to a SerializableAction for annotations
 */
const convertActionToSerializable = (action: Action): SerializableAction => {
  return {
    type: action.type,
    title: action.title,
    reasoning: action.reasoning,
    feedback: action.feedback, // This will be undefined when not provided, which is correct
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
    { q: query, num: 3 }, // Reduced from 5 to 3 for better performance
    new AbortController().signal,
  );

  // Extract URLs from search results
  const urls = results.organic.map((result) => result.link);

  // Scrape all URLs in parallel with timeout
  const scrapeResult = await bulkCrawlWebsites({ 
    urls,
    timeout: 5000, // 5 second timeout per URL
  });

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
 * Collects all search results, deduplicates them, and sends a single sources annotation
 */
const collectAndDisplaySources = async (
  queries: string[],
  conversationHistory: Message[] = [],
  langfuseTraceId?: string,
  writeMessageAnnotation?: (annotation: OurMessageAnnotation) => void,
) => {
  // Execute all searches in parallel with reduced results per query
  console.log(`🚀 Executing ${queries.length} searches in parallel...`);
  const searchPromises = queries.map(async (query) => {
    console.log(`🔍 Searching for: "${query}"`);
    return await searchSerper(
      { q: query, num: 3 }, // Reduced from 5 to 3 results per query
      new AbortController().signal,
    );
  });

  const allSearchResults = await Promise.all(searchPromises);
  
  // Collect all organic results and deduplicate by URL
  const allSources: SearchSource[] = [];
  const seenUrls = new Set<string>();
  
  allSearchResults.forEach((searchResult, queryIndex) => {
    searchResult.organic.forEach((result) => {
      if (!seenUrls.has(result.link)) {
        seenUrls.add(result.link);
        allSources.push({
          title: result.title,
          url: result.link,
          snippet: result.snippet,
          favicon: getFaviconUrl(result.link),
        });
      }
    });
  });

  // Limit to top 8 sources to improve performance
  const limitedSources = allSources.slice(0, 8);
  
  // Send single annotation with limited unique sources
  if (writeMessageAnnotation && limitedSources.length > 0) {
    writeMessageAnnotation({
      type: "DISPLAY_SOURCES",
      sources: limitedSources,
      query: `Combined results from ${queries.length} searches (showing top ${limitedSources.length})`,
    });
  }

  console.log(`📊 Found ${allSources.length} unique sources, limiting to top ${limitedSources.length} for performance`);
  
  // Only process the limited sources for scraping and summarization
  const uniqueUrls = limitedSources.map(source => source.url);
  
  // Scrape all unique URLs in parallel with timeout
  const scrapeResult = await bulkCrawlWebsites({ 
    urls: uniqueUrls,
    timeout: 5000, // 5 second timeout per URL
  });

  // Create a map of URL to scraped content for easy lookup
  const scrapedContentMap = new Map<string, string>();
  scrapeResult.results.forEach((result, index) => {
    const url = uniqueUrls[index];
    const content = result?.result.success 
      ? result.result.data 
      : `Error: ${result?.result.success === false ? result.result.error! : 'Unknown error'}`;
    scrapedContentMap.set(url!, content);
  });

  // Process each search result with its corresponding scraped content
  const processedResults = [];
  
  for (const searchResult of allSearchResults) {
    const queryIndex = allSearchResults.indexOf(searchResult);
    const query = queries[queryIndex]!;
    const resultsWithSummaries = [];
    
    // Only process results that are in our limited sources
    for (const result of searchResult.organic) {
      if (limitedSources.some(source => source.url === result.link)) {
        const scrapedContent = scrapedContentMap.get(result.link) || `Error: No scraped content available`;
        
        // Summarize the content
        try {
          const summary = await summarizeURL(
            conversationHistory,
            scrapedContent,
            {
              date: (result.date ?? new Date().toISOString().split('T')[0]) as string,
              title: result.title as string,
              url: result.link as string,
              snippet: result.snippet as string,
            },
            query,
            langfuseTraceId,
          );
          
          resultsWithSummaries.push({
            date: (result.date ?? new Date().toISOString().split('T')[0]) as string,
            title: result.title,
            url: result.link,
            snippet: result.snippet,
            scrapedContent,
            summary,
          });
        } catch (error) {
          console.error(`❌ Failed to summarize ${result.link}:`, error);
          resultsWithSummaries.push({
            date: (result.date ?? new Date().toISOString().split('T')[0]) as string,
            title: result.title,
            url: result.link,
            snippet: result.snippet,
            scrapedContent,
            summary: scrapedContent, // Fallback to scraped content
          });
        }
      }
    }
    
    if (resultsWithSummaries.length > 0) {
      processedResults.push({
        query,
        results: resultsWithSummaries,
      });
    }
  }

  return processedResults;
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
            feedback: `Planning to execute ${researchPlan.queries.length} search queries to gather comprehensive information.`,
          },
        } satisfies OurMessageAnnotation);
      }
      
      // 2. Always search based on the queries with deduplication
      const searchResults = await collectAndDisplaySources(
        researchPlan.queries,
        conversationHistory,
        langfuseTraceId,
        writeMessageAnnotation
      );
      
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
            feedback: `Successfully completed ${searchResults.length} searches and processed the results for evaluation.`,
          },
        } satisfies OurMessageAnnotation);
      }
      
      // 4. Decide whether to continue by calling getNextAction
      const nextAction = await getNextAction(ctx, langfuseTraceId);
      console.log(`🤖 LLM chose action: ${nextAction.type}`);
      
      // Store the feedback from getNextAction for use in the next iteration (if provided)
      if (nextAction.feedback) {
        ctx.setLastFeedback(nextAction.feedback);
        console.log(`📝 Stored evaluation feedback: ${nextAction.feedback.substring(0, 100)}...`);
      } else {
        console.log(`✅ No feedback needed - ready to answer the question`);
      }
      
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
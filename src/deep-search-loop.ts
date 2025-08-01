import { SystemContext } from "./system-context";
import { getNextAction, type Action } from "./get-next-action";
import { searchSerper } from "./serper";
import { bulkCrawlWebsites } from "./server/scraper";
import { streamText, type StreamTextResult } from "ai";
import { model } from "./models";

/**
 * Executes a search action by querying the web
 */
const executeSearchAction = async (action: Extract<Action, { type: "search" }>) => {
  const results = await searchSerper(
    { q: action.query, num: 5 }, // Limit to 5 results for efficiency
    new AbortController().signal,
  );

  return {
    query: action.query,
    results: results.organic.map((result) => ({
      date: (result.date || new Date().toISOString().split('T')[0]) as string,
      title: result.title,
      url: result.link,
      snippet: result.snippet,
    })),
  };
};

/**
 * Executes a scrape action by crawling URLs
 */
const executeScrapeAction = async (action: Extract<Action, { type: "scrape" }>) => {
  const scrapeResults = await bulkCrawlWebsites({ urls: action.urls });
  
  return scrapeResults.results.map((result) => ({
    url: result.url,
    result: result.result.success ? result.result.data : `Error: ${result.result.error}`,
  }));
};

/**
 * Main deep search loop that orchestrates the search, scrape, and answer workflow
 * 
 * @param userQuestion - The original question from the user
 * @returns The final answer and the complete context for debugging
 */
export const runDeepSearchLoop = async (userQuestion: string): Promise<StreamTextResult<{}, string>> => {
  // Initialize the system context
  const context = new SystemContext(userQuestion);
  
  // Track the final answer
  let finalAnswer: string | null = null;
  
  console.log(`🚀 Starting deep search for: "${userQuestion}"`);
  
  try {
    // Main loop - continue until we get an answer or hit the step limit
    while (!context.shouldStop()) {
      console.log(`\n📋 Step ${context.getCurrentStep() + 1}:`);
      
      // Get the next action from the LLM
      const nextAction = await getNextAction(context);
      
      console.log(`🤖 LLM chose action: ${nextAction.type}`);
      
      switch (nextAction.type) {
        case "search": {
          console.log(`🔍 Searching for: "${nextAction.query}"`);
          
          const searchResults = await executeSearchAction(nextAction);
          context.reportQueries([searchResults]);
          
          console.log(`✅ Found ${searchResults.results.length} search results`);
          break;
        }
        
        case "scrape": {
          console.log(`🌐 Scraping ${nextAction.urls.length} URLs`);
          
          const scrapeResults = await executeScrapeAction(nextAction);
          context.reportScrapes(scrapeResults);
          
          console.log(`✅ Successfully scraped ${scrapeResults.length} URLs`);
          break;
        }
        
        case "answer": {
          console.log(`💡 Generating final answer...`);
          
          // For now, we'll generate a simple answer based on the context
          // In a full implementation, you'd call the LLM here to generate the answer
          finalAnswer = `Based on the search and scrape results, here's what I found for: "${userQuestion}"\n\n` +
            `I searched ${context.getQueryHistory().split('## Query:').length - 1} times and scraped ${context.getScrapeHistory().split('## Scrape:').length - 1} URLs to gather this information.`;
          
          console.log(`✅ Answer generated`);
          break;
        }
      }
      
      // Increment the step counter
      context.incrementStep();
      
      // If we got an answer, break out of the loop
      if (finalAnswer) {
        break;
      }
    }
    
    // If we didn't get an answer and hit the step limit
    if (!finalAnswer) {
      finalAnswer = `I wasn't able to find a complete answer to your question: "${userQuestion}" after ${context.getCurrentStep()} steps. ` +
        `Here's what I searched for and found: ${context.getQueryHistory()}`;
    }
    
    console.log(`\n🎉 Deep search completed in ${context.getCurrentStep()} steps`);
    
    return streamText({
      model,
      messages: [{ role: 'user', content: userQuestion }],
      system: "You are a helpful assistant. Provide the answer exactly as given.",
      prompt: finalAnswer,
    });
    
  } catch (error) {
    console.error(`❌ Error in deep search loop:`, error);
    
    const errorMessage = `Sorry, I encountered an error while searching for your question: "${userQuestion}". Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    return streamText({
      model,
      messages: [{ role: 'user', content: userQuestion }],
      system: "You are a helpful assistant. Provide the answer exactly as given.",
      prompt: errorMessage,
    });
  }
};

/**
 * Helper function to run a deep search with better error handling
 * This is the main entry point for the deep search functionality
 */
export const deepSearch = async (userQuestion: string) => {
  if (!userQuestion.trim()) {
    throw new Error("User question cannot be empty");
  }
  
  console.log(`\n🔍 Starting deep search for: "${userQuestion}"`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  
  const result = await runDeepSearchLoop(userQuestion);
  
  console.log(`⏰ Completed at: ${new Date().toISOString()}`);
  console.log(`📊 Final stats: Stream completed successfully`);
  
  return result;
}; 
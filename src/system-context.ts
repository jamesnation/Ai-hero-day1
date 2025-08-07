import type { Message } from "ai";

/**
 * Represents token usage information
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  source: string; // Description of where the usage came from
}

/**
 * Represents a search result with scraped content and summary
 */
type SearchResult = {
  date: string;
  title: string;
  url: string;
  snippet: string;
  scrapedContent: string;
  summary: string;
};

/**
 * Represents a search history entry that combines query and scrape data
 */
type SearchHistoryEntry = {
  query: string;
  results: SearchResult[];
};

/**
 * SystemContext manages the state and history for the deep search system.
 * It tracks searches and their associated scraped content, and provides formatted output for LLM consumption.
 */
export class SystemContext {
  /**
   * The current step in the loop
   */
  private step = 0;

  /**
   * The original user question being answered
   */
  private userQuestion: string;

  /**
   * The conversation history for context
   */
  private conversationHistory: Message[];

  /**
   * The history of all searches with their associated scraped content
   */
  private searchHistory: SearchHistoryEntry[] = [];

  /**
   * The most recent feedback from getNextAction
   */
  private lastFeedback = "";

  /**
   * The history of token usage across all LLM calls
   */
  private tokenUsage: TokenUsage[] = [];

  /**
   * Constructor to initialize the context with the user question and conversation history
   */
  constructor(userQuestion: string, conversationHistory: Message[] = []) {
    this.userQuestion = userQuestion;
    this.conversationHistory = conversationHistory;
  }

  /**
   * Determines if the search loop should stop
   * Currently stops after 10 steps to prevent infinite loops
   */
  shouldStop(): boolean {
    return this.step >= 10;
  }

  /**
   * Gets the current step number
   */
  getCurrentStep(): number {
    return this.step;
  }

  /**
   * Gets the original user question
   */
  getUserQuestion(): string {
    return this.userQuestion;
  }

  /**
   * Adds new search results to the history
   */
  reportSearch(search: SearchHistoryEntry): void {
    this.searchHistory.push(search);
  }

  /**
   * Stores the most recent feedback from getNextAction
   */
  setLastFeedback(feedback?: string): void {
    this.lastFeedback = feedback ?? "";
  }

  /**
   * Gets the most recent feedback from getNextAction
   */
  getLastFeedback(): string {
    return this.lastFeedback;
  }

  /**
   * Reports token usage from an LLM call
   */
  reportUsage(source: string, usage: { promptTokens: number; completionTokens: number; totalTokens: number }): void {
    this.tokenUsage.push({
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      source,
    });
  }

  /**
   * Gets the total token usage across all LLM calls
   */
  getTotalTokenUsage(): number {
    return this.tokenUsage.reduce((total, usage) => total + usage.totalTokens, 0);
  }

  /**
   * Gets the detailed token usage history
   */
  getTokenUsageHistory(): TokenUsage[] {
    return [...this.tokenUsage];
  }

  /**
   * Increments the current step counter
   */
  incrementStep(): void {
    this.step++;
  }

  /**
   * Formats the conversation history for LLM consumption
   */
  getFormattedConversationHistory(): string {
    if (this.conversationHistory.length === 0) {
      return "No previous conversation.";
    }

    return this.conversationHistory
      .map((message) => `${message.role}: ${message.content}`)
      .join("\n\n");
  }

  /**
   * Returns the search history formatted for LLM consumption
   * Uses markdown formatting for better readability and includes summaries
   */
  getSearchHistory(): string {
    return this.searchHistory
      .map((search) =>
        [
          `## Query: "${search.query}"`,
          ...search.results.map((result) =>
            [
              `### ${result.date} - ${result.title}`,
              result.url,
              result.snippet,
              `<summary>`,
              result.summary,
              `</summary>`,
            ].join("\n\n"),
          ),
        ].join("\n\n"),
      )
      .join("\n\n");
  }

  /**
   * Returns a complete formatted context for LLM consumption
   * Combines conversation history, user question, search history with current step information
   */
  getFormattedContext(): string {
    const parts = [
      "## Conversation History:",
      this.getFormattedConversationHistory(),
      "",
      `## Current User Question: "${this.userQuestion}"`,
      "",
      `## Current Step: ${this.step}`,
      "",
      "## Search History:",
      this.getSearchHistory(),
    ];

    // Add feedback if available
    if (this.lastFeedback) {
      parts.push("", "## Previous Evaluation Feedback:", this.lastFeedback);
    }

    return parts.join("\n\n");
  }
} 
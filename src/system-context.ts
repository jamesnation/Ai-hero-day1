import type { Message } from "ai";

/**
 * Represents a search result with scraped content
 */
type SearchResult = {
  date: string;
  title: string;
  url: string;
  snippet: string;
  scrapedContent: string;
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
   * Uses markdown formatting for better readability
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
              `<scrape_result>`,
              result.scrapedContent,
              `</scrape_result>`,
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

    return parts.join("\n\n");
  }
} 
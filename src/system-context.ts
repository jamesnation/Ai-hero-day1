/**
 * Represents a single search result from a query
 */
type QueryResultSearchResult = {
  date: string;
  title: string;
  url: string;
  snippet: string;
};

/**
 * Represents the complete results from a single search query
 */
type QueryResult = {
  query: string;
  results: QueryResultSearchResult[];
};

/**
 * Represents the result of scraping a single URL
 */
type ScrapeResult = {
  url: string;
  result: string;
};

/**
 * SystemContext manages the state and history for the deep search system.
 * It tracks queries, scrapes, and provides formatted output for LLM consumption.
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
   * The history of all queries searched
   */
  private queryHistory: QueryResult[] = [];

  /**
   * The history of all URLs scraped
   */
  private scrapeHistory: ScrapeResult[] = [];

  /**
   * Constructor to initialize the context with the user question
   */
  constructor(userQuestion: string) {
    this.userQuestion = userQuestion;
  }

  /**
   * Determines if the search loop should stop
   * Currently stops after 10 steps to prevent infinite loops
   */
  shouldStop(): boolean {
    return this.step >= 10;
  }

  /**
   * Adds new query results to the history
   */
  reportQueries(queries: QueryResult[]): void {
    this.queryHistory.push(...queries);
  }

  /**
   * Adds new scrape results to the history
   */
  reportScrapes(scrapes: ScrapeResult[]): void {
    this.scrapeHistory.push(...scrapes);
  }

  /**
   * Increments the current step counter
   */
  incrementStep(): void {
    this.step++;
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
   * Formats a single search result for LLM consumption
   */
  private toQueryResult(query: QueryResultSearchResult): string {
    return [
      `### ${query.date} - ${query.title}`,
      query.url,
      query.snippet,
    ].join("\n\n");
  }

  /**
   * Returns the query history formatted for LLM consumption
   * Uses markdown formatting for better readability
   */
  getQueryHistory(): string {
    return this.queryHistory
      .map((query) =>
        [
          `## Query: "${query.query}"`,
          ...query.results.map(this.toQueryResult),
        ].join("\n\n"),
      )
      .join("\n\n");
  }

  /**
   * Returns the scrape history formatted for LLM consumption
   * Wraps scrape results in XML tags to distinguish from markdown content
   */
  getScrapeHistory(): string {
    return this.scrapeHistory
      .map((scrape) =>
        [
          `## Scrape: "${scrape.url}"`,
          `<scrape_result>`,
          scrape.result,
          `</scrape_result>`,
        ].join("\n\n"),
      )
      .join("\n\n");
  }

  /**
   * Returns a complete formatted context for LLM consumption
   * Combines user question, query and scrape history with current step information
   */
  getFormattedContext(): string {
    const parts = [
      `## User Question: "${this.userQuestion}"`,
      "",
      `## Current Step: ${this.step}`,
      "",
      "## Query History:",
      this.getQueryHistory(),
      "",
      "## Scrape History:",
      this.getScrapeHistory(),
    ];

    return parts.join("\n\n");
  }
} 
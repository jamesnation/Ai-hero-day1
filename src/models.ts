import { google } from "@ai-sdk/google";

// Export the Gemini model for use throughout the app
export const model = google("gemini-2.0-flash-001");

// Model for factuality evaluation (LLM-as-a-judge)
export const factualityModel = google("gemini-1.5-flash");

// Model for summarization - fast with large context window
export const summarizationModel = google("gemini-2.0-flash-lite"); 
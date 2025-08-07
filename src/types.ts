// Simplified action type for annotations that only includes serializable data
export type SerializableAction = {
  type: "answer";
  title: string;
  reasoning: string;
  feedback?: string;
};

// Source information for displaying search results
export type SearchSource = {
  title: string;
  url: string;
  snippet: string;
  favicon?: string;
};

// Discriminated union for different annotation types
export type OurMessageAnnotation = 
  | {
      type: "NEW_ACTION";
      action: SerializableAction;
    }
  | {
      type: "DISPLAY_SOURCES";
      sources: SearchSource[];
      query: string;
    }
  | {
      type: "TOKEN_USAGE";
      totalTokens: number;
    }; 
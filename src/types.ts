// Simplified action type for annotations that only includes serializable data
export type SerializableAction = {
  type: "search" | "scrape" | "answer";
  title: string;
  reasoning: string;
  query?: string;
  urls?: string[];
};

export type OurMessageAnnotation = {
  type: "NEW_ACTION";
  action: SerializableAction;
}; 
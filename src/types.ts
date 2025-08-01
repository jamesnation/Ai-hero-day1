// Simplified action type for annotations that only includes serializable data
export type SerializableAction = {
  type: "search" | "answer";
  title: string;
  reasoning: string;
  query?: string;
};

export type OurMessageAnnotation = {
  type: "NEW_ACTION";
  action: SerializableAction;
}; 
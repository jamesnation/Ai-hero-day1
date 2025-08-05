// Simplified action type for annotations that only includes serializable data
export type SerializableAction = {
  type: "answer";
  title: string;
  reasoning: string;
};

export type OurMessageAnnotation = {
  type: "NEW_ACTION";
  action: SerializableAction;
}; 
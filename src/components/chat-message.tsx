import type { Message } from "ai";

export type MessagePart = NonNullable<Message["parts"]>[number];

interface ChatMessageProps {
  parts: MessagePart[];
  role: string;
  userName: string;
}

export const ChatMessage = ({ parts, role, userName }: ChatMessageProps) => {
  const isAI = role === "assistant";

  return (
    <div className="mb-6">
      <div
        className={`rounded-lg p-4 ${
          isAI ? "bg-gray-800 text-gray-300" : "bg-gray-900 text-gray-300"
        }`}
      >
        <p className="mb-2 text-sm font-semibold text-gray-400">
          {isAI ? "AI" : userName}
        </p>
        <div className="prose prose-invert max-w-none">
          {parts.map((part, idx) => (
            <div
              key={idx}
              title={`MessagePart type: ${part.type} (hover to see all possible types)`}
              className="mb-2"
            >
              {part.type === "text" && (
                <span>{part.text}</span>
              )}
              {part.type === "tool-invocation" && (
                <pre className="bg-gray-900 text-green-400 p-2 rounded text-xs overflow-x-auto">
                  Tool Call: {JSON.stringify(part.toolInvocation, null, 2)}
                </pre>
              )}
              {/* You can add more part types here as needed */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

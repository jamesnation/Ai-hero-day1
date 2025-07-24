import type { Message } from "ai";
import ReactMarkdown from "react-markdown";

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
        <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-li:my-1">
          {parts.map((part, idx) => (
            <div
              key={idx}
              title={`MessagePart type: ${part.type} (hover to see all possible types)`}
              className="mb-2"
            >
              {part.type === "text" && (
                <ReactMarkdown
                  components={{
                    // Customize link styling to match the theme
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        {children}
                      </a>
                    ),
                    // Ensure proper spacing for paragraphs
                    p: ({ children }) => (
                      <p className="mb-3 last:mb-0">{children}</p>
                    ),
                    // Style lists properly
                    ul: ({ children }) => (
                      <ul className="mb-3 ml-4 space-y-1">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="mb-3 ml-4 space-y-1">{children}</ol>
                    ),
                    li: ({ children }) => (
                      <li className="list-disc">{children}</li>
                    ),
                  }}
                >
                  {part.text}
                </ReactMarkdown>
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

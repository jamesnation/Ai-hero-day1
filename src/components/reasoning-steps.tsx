import { useState } from "react";
import { SearchIcon, MessageSquareIcon, GlobeIcon, HashIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { OurMessageAnnotation } from "../types";
import { SourcesDisplay } from "./sources-display";

export const ReasoningSteps = ({
  annotations,
}: {
  annotations: OurMessageAnnotation[];
}) => {
  const [openStep, setOpenStep] = useState<number | null>(null);

  if (annotations.length === 0) return null;

  return (
    <div className="mb-4 w-full">
      <ul className="space-y-1">
        {annotations.map((annotation, index) => {
          const isOpen = openStep === index;
          
          // Handle different annotation types
          if (annotation.type === "NEW_ACTION") {
            return (
              <li key={index} className="relative">
                <button
                  onClick={() =>
                    setOpenStep(isOpen ? null : index)
                  }
                  className={`min-w-34 flex w-full flex-shrink-0 items-center rounded px-2 py-1 text-left text-sm transition-colors ${
                    isOpen
                      ? "bg-gray-700 text-gray-200"
                      : "text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                  }`}
                >
                  <span
                    className={`z-10 mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-500 text-xs font-bold ${
                      isOpen
                        ? "border-blue-400 text-white"
                        : "bg-gray-800 text-gray-300"
                    }`}
                  >
                    {index + 1}
                  </span>
                  {annotation.action.title}
                </button>
                <div
                  className={`${isOpen ? "mt-1" : "hidden"}`}
                >
                  {isOpen && (
                    <div className="px-2 py-1">
                      <div className="text-sm italic text-gray-400">
                        <ReactMarkdown>
                          {annotation.action.reasoning}
                        </ReactMarkdown>
                      </div>
                      
                      {/* Display feedback if available */}
                      {annotation.action.feedback && (
                        <div className="mt-3 p-2 bg-gray-800 rounded border-l-2 border-blue-400">
                          <div className="flex items-center gap-2 text-sm text-blue-300 mb-1">
                            <MessageSquareIcon className="size-4" />
                            <span className="font-medium">Evaluation Feedback</span>
                          </div>
                          <div className="text-sm text-gray-300">
                            <ReactMarkdown>
                              {annotation.action.feedback}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                      
                      {annotation.action.type ===
                        "answer" && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                          <SearchIcon className="size-4" />
                          <span>
                            {annotation.action.title.includes("Planning") 
                              ? "Planning research strategy..."
                              : annotation.action.title.includes("Completed") 
                              ? "Processing search results..."
                              : "Ready to provide answer"}
                          </span>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              </li>
            );
          } else if (annotation.type === "DISPLAY_SOURCES") {
            return (
              <li key={index} className="relative">
                <button
                  onClick={() =>
                    setOpenStep(isOpen ? null : index)
                  }
                  className={`min-w-34 flex w-full flex-shrink-0 items-center rounded px-2 py-1 text-left text-sm transition-colors ${
                    isOpen
                      ? "bg-gray-700 text-gray-200"
                      : "text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                  }`}
                >
                  <span
                    className={`z-10 mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-500 text-xs font-bold ${
                      isOpen
                        ? "border-blue-400 text-white"
                        : "bg-gray-800 text-gray-300"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <GlobeIcon className="size-4" />
                    <span>Found {annotation.sources.length} sources</span>
                  </div>
                </button>
                <div
                  className={`${isOpen ? "mt-1" : "hidden"}`}
                >
                  {isOpen && (
                    <div className="px-2 py-1">
                      <SourcesDisplay 
                        sources={annotation.sources} 
                        query={annotation.query} 
                      />
                    </div>
                  )}
                </div>
              </li>
            );
          } else if (annotation.type === "TOKEN_USAGE") {
            return (
              <li key={index} className="relative">
                <div className="flex items-center gap-2 px-2 py-1 text-sm text-gray-400">
                  <HashIcon className="size-4" />
                  <span>Tokens used: {annotation.totalTokens.toLocaleString()}</span>
                </div>
              </li>
            );
          }
          
          return null;
        })}
      </ul>
    </div>
  );
}; 
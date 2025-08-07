import { ExternalLinkIcon } from "lucide-react";
import type { SearchSource } from "../types";

interface SourcesDisplayProps {
  sources: SearchSource[];
  query: string;
}

export const SourcesDisplay = ({ sources, query }: SourcesDisplayProps) => {
  if (sources.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span className="font-medium">Sources for:</span>
        <span className="italic">"{query}"</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sources.map((source, index) => (
          <a
            key={index}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block p-3 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 hover:border-gray-600 transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* Favicon */}
              <div className="flex-shrink-0">
                <img
                  src={source.favicon}
                  alt=""
                  className="size-5 rounded"
                  onError={(e) => {
                    // Fallback to a default icon if favicon fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium text-gray-200 group-hover:text-white line-clamp-2">
                    {source.title}
                  </h4>
                  <ExternalLinkIcon className="size-4 text-gray-500 group-hover:text-gray-400 flex-shrink-0 mt-0.5" />
                </div>
                <p className="mt-1 text-xs text-gray-400 line-clamp-3">
                  {source.snippet}
                </p>
                <p className="mt-2 text-xs text-gray-500 truncate">
                  {new URL(source.url).hostname}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

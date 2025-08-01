import {
  streamText,
  type Message,
  type TelemetrySettings,
  type StreamTextResult,
} from "ai";
import { model } from "./models";
import { runAgentLoop } from "./run-agent-loop";
import { answerQuestion } from "./answer-question";
import { SystemContext } from "./system-context";
import type { OurMessageAnnotation } from "./types";

/**
 * Streams the result of a deep search using the new agent loop system
 * 
 * @param opts - Options including messages, onFinish callback, telemetry settings, and writeMessageAnnotation function
 * @returns A promise that resolves to a StreamTextResult
 */
export const streamFromDeepSearch = async (opts: {
  messages: Message[];
  onFinish: Parameters<typeof streamText>[0]["onFinish"];
  telemetry: TelemetrySettings;
  writeMessageAnnotation?: (annotation: OurMessageAnnotation) => void;
}): Promise<StreamTextResult<{}, string>> => {
  // Get the user's question from the last message
  const lastMessage = opts.messages[opts.messages.length - 1];
  if (!lastMessage) {
    throw new Error("No messages provided");
  }
  
  const userQuestion = String(lastMessage.content);

  // Extract langfuseTraceId from telemetry metadata if available
  const langfuseTraceId = opts.telemetry.metadata?.langfuseTraceId as string | undefined;

  // Run the agent loop to get the answer
  const result = await runAgentLoop(userQuestion, opts.writeMessageAnnotation, langfuseTraceId);
  
  // Return the result directly since it's already a StreamTextResult
  return result;
};

/**
 * Runs a deep search and returns the text result
 * 
 * @param messages - The conversation messages
 * @returns The answer as a string
 */
export async function askDeepSearch(messages: Message[]): Promise<string> {
  const result = await streamFromDeepSearch({
    messages,
    onFinish: () => {},
    telemetry: { isEnabled: false },
  });
  
  await result.consumeStream();
  return await result.text;
} 
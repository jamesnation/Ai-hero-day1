import type { Message } from "ai";
import { generateText } from "ai";
import { model } from "./models";

export function isNewChatCreated(data: any): data is { type: "NEW_CHAT_CREATED"; chatId: string } {
  return data?.type === "NEW_CHAT_CREATED" && typeof data?.chatId === "string";
}

/**
 * Extracts the favicon URL for a given URL
 * Uses Google's favicon service as a fallback
 */
export const getFaviconUrl = (url: string): string => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    // If URL parsing fails, return a default favicon
    return "https://www.google.com/s2/favicons?domain=example.com&sz=32";
  }
};

export const generateChatTitle = async (
  messages: Message[],
) => {
  const { text } = await generateText({
    model,
    system: `You are a chat title generator.
      You will be given a chat history, and you will need to generate a title for the chat.
      The title should be a single sentence that captures the essence of the chat.
      The title should be no more than 50 characters.
      The title should be in the same language as the chat history.
      `,
    prompt: `Here is the chat history:

      ${messages.map((m) => m.content).join("\n")}
    `,
  });

  return text;
}; 
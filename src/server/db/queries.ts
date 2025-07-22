import { db } from "./index";
import { chats, messages } from "./schema";
import { eq, and, asc } from "drizzle-orm";
import type { Message as AIMessage } from "ai";

// Helper function to upsert (insert or update) a chat and its messages
export async function upsertChat(opts: {
  userId: string;
  chatId: string;
  title: string;
  messages: AIMessage[];
}) {
  // Check if the chat exists and belongs to the user
  const existingChat = await db.query.chats.findFirst({
    where: and(eq(chats.id, opts.chatId), eq(chats.userId, opts.userId)),
  });

  if (existingChat) {
    // Delete all existing messages for this chat
    await db.delete(messages).where(eq(messages.chatId, opts.chatId));
    // Update the chat title and updatedAt
    await db.update(chats)
      .set({ title: opts.title, updatedAt: new Date() })
      .where(eq(chats.id, opts.chatId));
  } else {
    // --- SECURITY CHECK ---
    // Check if a chat with this chatId exists for a different user
    const chatWithSameId = await db.query.chats.findFirst({
      where: eq(chats.id, opts.chatId),
    });
    if (chatWithSameId && chatWithSameId.userId !== opts.userId) {
      // If the chatId is already used by another user, throw an error
      throw new Error("Chat ID already exists for another user");
    }
    // --- END SECURITY CHECK ---

    // Create a new chat
    await db.insert(chats).values({
      id: opts.chatId,
      userId: opts.userId,
      title: opts.title,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Insert all messages for this chat
  if (opts.messages.length > 0) {
    await db.insert(messages).values(
      opts.messages.map((msg, idx) => ({
        id: crypto.randomUUID(),
        chatId: opts.chatId,
        role: msg.role,
        parts: msg.parts, // assuming msg.content is JSON-serializable
        order: idx,
        createdAt: new Date(),
      }))
    );
  }
}

// Helper function to get a chat and all its messages (for a user)
export async function getChat(opts: { userId: string; chatId: string }) {
  // Get the chat (ensure it belongs to the user)
  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, opts.chatId), eq(chats.userId, opts.userId)),
  });
  if (!chat) return null;

  // Get all messages for this chat, ordered by 'order'
  const chatMessages = await db.query.messages.findMany({
    where: eq(messages.chatId, opts.chatId),
    orderBy: asc(messages.order),
  });

  return { ...chat, messages: chatMessages };
}

// Helper function to get all chats for a user (without messages)
export async function getChats(opts: { userId: string }) {
  // Get all chats for the user, ordered by updatedAt descending (most recent first)
  return db.query.chats.findMany({
    where: eq(chats.userId, opts.userId),
    orderBy: [chats.updatedAt],
  });
}

// ---
// Each function is commented to help you understand what it does and why.
// If you have questions about any part, just ask! 
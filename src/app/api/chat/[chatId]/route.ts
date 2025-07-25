import { NextRequest } from "next/server";
import { db } from "../../../../server/db/index";
import { chats } from "../../../../server/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "../../../../server/auth/index.ts";

export async function DELETE(request: NextRequest, { params }: { params: { chatId: string } }) {
  // Authenticate the user
  const session = await auth();
  if (!session || !session.user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = session.user.id;
  const chatId = params.chatId;

  // Fetch the chat from the database
  const [chat] = await db.select().from(chats).where(eq(chats.id, chatId));

  if (!chat) {
    return new Response(JSON.stringify({ error: "Chat not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check if the user is the owner
  if (chat.userId !== userId) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Delete the chat
  await db.delete(chats).where(eq(chats.id, chatId));

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
} 
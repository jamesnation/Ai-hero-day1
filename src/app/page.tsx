import { PlusIcon } from "lucide-react";
import { Sidebar } from "../components/sidebar";
import { auth } from "~/server/auth/index.ts";
import { ChatPage } from "./chat.tsx";
import { getChats, getChat } from "../server/db/queries";
import type { Message } from "ai";
import type { OurMessageAnnotation } from "~/types";
import { randomUUID } from "crypto";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await auth();
  const userName = session?.user?.name ?? "Guest";
  const isAuthenticated = !!session?.user;
  const { id: chatIdFromUrl } = await searchParams;
  const chatId = chatIdFromUrl ?? randomUUID();
  const isNewChat = !chatIdFromUrl;

  let chats: any[] = [];
  let initialMessages: Message[] = [];
  const activeChatId = chatIdFromUrl;

  if (isAuthenticated && session.user.id) {
    chats = await getChats({ userId: session.user.id });
    if (chatIdFromUrl) {
      const dbChat = await getChat({ userId: session.user.id, chatId: chatIdFromUrl });
      initialMessages = dbChat?.messages?.map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        parts: Array.isArray(msg.parts) ? msg.parts : [],
        content: "",
        annotations: msg.annotations as OurMessageAnnotation[] | undefined, // Cast to correct type
      })) ?? [];
    }
  }

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        isAuthenticated={isAuthenticated}
        session={session}
      />
      <ChatPage
        key={chatId}
        userName={userName}
        isAuthenticated={isAuthenticated}
        chatId={chatId}
        isNewChat={isNewChat}
        initialMessages={initialMessages}
      />
    </div>
  );
}

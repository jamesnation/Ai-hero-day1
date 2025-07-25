"use client";

import { PlusIcon, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AuthButton } from "./auth-button";

interface SidebarProps {
  chats: any[];
  activeChatId: string | undefined;
  isAuthenticated: boolean;
  session: any;
}

export function Sidebar({ chats: initialChats, activeChatId, isAuthenticated, session }: SidebarProps) {
  const [chats, setChats] = useState<any[]>(initialChats);
  const router = useRouter();

  const handleDelete = async (chatId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this chat?");
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/chat/${chatId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete chat");
      }
      setChats((prev: any[]) => prev.filter((chat) => chat.id !== chatId));
      toast.success("Chat deleted!");
      if (chatId === activeChatId) {
        router.push("/");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex w-64 flex-col border-r border-gray-700 bg-gray-900">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-400">Your Chats</h2>
          {isAuthenticated && (
            <Link
              href="/"
              className="flex size-8 items-center justify-center rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              title="New Chat"
            >
              <PlusIcon className="size-5" />
            </Link>
          )}
        </div>
      </div>
      <div className="-mt-1 flex-1 space-y-2 overflow-y-auto px-4 pt-1 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600">
        {chats.length > 0 ? (
          chats.map((chat) => (
            <div key={chat.id} className="flex items-center gap-2 group">
              <Link
                href={`/?id=${chat.id}`}
                className={`flex-1 rounded-lg p-3 text-left text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  chat.id === activeChatId
                    ? "bg-gray-700"
                    : "hover:bg-gray-750 bg-gray-800"
                }`}
              >
                {chat.title}
              </Link>
              <button
                onClick={() => handleDelete(chat.id)}
                className="ml-1 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete chat"
                tabIndex={-1}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">
            {isAuthenticated
              ? "No chats yet. Start a new conversation!"
              : "Sign in to start chatting"}
          </p>
        )}
      </div>
      <div className="p-4">
        <AuthButton
          isAuthenticated={isAuthenticated}
          userImage={session?.user?.image}
        />
      </div>
    </div>
  );
} 
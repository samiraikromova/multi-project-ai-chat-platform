"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@supabase/auth-helpers-react"; // or your auth hook
import Link from "next/link";

interface ChatThread {
  id: string;
  title: string;
  model: string;
  created_at: string;
}

export default function HistoryPage() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);

  const session = useSession();
  const supabase = createClient(); // ✅ CREATE CLIENT INSTANCE

  useEffect(() => {
    if (!session?.user) return;

    const fetchThreads = async () => {
      const { data, error } = await supabase
        .from("chat_threads")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) console.error(error);
      else setThreads(data || []); // ✅ HANDLE NULL
      setLoading(false);
    };

    fetchThreads();
  }, [session, supabase]); // ✅ ADD SUPABASE TO DEPS

  const deleteThread = async (id: string) => {
    const { error } = await supabase.from("chat_threads").delete().eq("id", id);
    if (error) console.error(error);
    else setThreads((prev) => prev.filter((t) => t.id !== id));
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="flex flex-col w-full max-w-md mx-auto mt-10 gap-2">
      <h1 className="text-xl font-bold mb-4">History</h1>

      <Link
        href="/dashboard"
        className="flex justify-between items-center px-4 py-2 border rounded-md hover:bg-gray-50"
      >
        All Projects
        <span className="ml-2">→</span>
      </Link>

      {threads.map((thread) => (
        <div
          key={thread.id}
          className="flex justify-between items-center px-4 py-2 bg-gray-50 rounded-md hover:bg-gray-100"
        >
          <Link href={`/chat/${thread.id}`} className="flex-1">
            {thread.title}
          </Link>
          <button
            className="ml-2 text-gray-500 hover:text-red-500"
            onClick={() => deleteThread(thread.id)}
          >
            ⋯
          </button>
        </div>
      ))}
    </div>
  );
}
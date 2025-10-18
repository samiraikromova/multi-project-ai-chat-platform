"use client"
import CB4Chat from "./CB4Chat"
export default function ClientAdWritingChat({ userId }: { userId: string }) {
  return <CB4Chat userId={userId} projectName="Client Ad Writing" projectSlug="client-ads" projectEmoji="💎" />
}
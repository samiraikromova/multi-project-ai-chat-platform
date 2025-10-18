"use client"
import CB4Chat from "./CB4Chat"
export default function ContractsWriterChat({ userId }: { userId: string }) {
  return <CB4Chat userId={userId} projectName="Contracts Writer" projectSlug="contracts" projectEmoji="📋" />
}
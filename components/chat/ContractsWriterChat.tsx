"use client"
import ProjectChatWrapper from "./ProjectChatWrapper"

export default function ContractsWriterChat({ userId }: { userId: string }) {
  return (
    <ProjectChatWrapper
      userId={userId}
      projectSlug="contracts"
      projectName="Contracts Writer"
      projectEmoji="📋"
    />
  )
}
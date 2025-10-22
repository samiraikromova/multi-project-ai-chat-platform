"use client"
import ProjectChatWrapper from "./ProjectChatWrapper"

export default function ClientAdWritingChat({ userId }: { userId: string }) {
  return (
    <ProjectChatWrapper
      userId={userId}
      projectSlug="client-ads"
      projectName="Client Ad Writing"
      projectEmoji="💎"
    />
  )
}
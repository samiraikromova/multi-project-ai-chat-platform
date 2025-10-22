"use client"
import ProjectChatWrapper from "./ProjectChatWrapper"

export default function StudentAdWritingChat({ userId }: { userId: string }) {
  return (
    <ProjectChatWrapper
      userId={userId}
      projectSlug="student-ads"
      projectName="Student Ad Writing"
      projectEmoji="🎓"
    />
  )
}
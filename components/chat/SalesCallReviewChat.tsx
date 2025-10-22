"use client"
import ProjectChatWrapper from "./ProjectChatWrapper"

export default function SalesCallReviewChat({ userId }: { userId: string }) {
  return (
    <ProjectChatWrapper
      userId={userId}
      projectSlug="sales-transcript"
      projectName="Sales Call Review"
      projectEmoji="📞"
    />
  )
}
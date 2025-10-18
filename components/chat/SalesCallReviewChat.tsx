"use client"
import CB4Chat from "./CB4Chat"
export default function SalesCallReviewChat({ userId }: { userId: string }) {
  return <CB4Chat userId={userId} projectName="Sales Call Review" projectSlug="sales-transcript" projectEmoji="📞" />
}

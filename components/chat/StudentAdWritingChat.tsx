"use client"
import CB4Chat from "./CB4Chat"
export default function StudentAdWritingChat({ userId }: { userId: string }) {
  return <CB4Chat userId={userId} projectName="Student Ad Writing" projectSlug="student-ads" projectEmoji="🎓" />
}
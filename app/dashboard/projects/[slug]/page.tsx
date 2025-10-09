import CB4Chat from "@/components/chat/CB4Chat";
import React from "react";

export default function ProjectPage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  if (slug === "cb4") {
    return <CB4Chat userId="demo-user" />;
  }

  return <div>Project {slug} coming soon...</div>;
}

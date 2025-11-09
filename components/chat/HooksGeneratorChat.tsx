"use client"

import { useState } from "react"
import CB4Chat from "./CB4Chat"

interface HooksGenProps {
  userId: string
  projectId: string
  projectSlug: string
  projectName: string
  projectEmoji: string
  systemPrompt: string
  _projectColor: string
}

export default function HooksGeneratorChat(props: HooksGenProps) {
  const [platform, setPlatform] = useState('all')
  const [batchCount, setBatchCount] = useState(5)

  const enhancedSystemPrompt = `${props.systemPrompt}

IMPORTANT: Generate ${batchCount} scroll-stopping hooks optimized for ${platform === 'all' ? 'all platforms' : platform}.

Format each hook with:
1. The hook text
2. Why it works
3. Best use case

Return as JSON array for easy parsing.`

  return (
    <div className="h-screen flex flex-col">
      {/* Custom Controls */}
      <div className="border-b border-[#e0ddd4] bg-white px-6 py-3">
        <div className="flex gap-4 items-center">
          <div>
            <label className="text-[12px] text-[#6b6b6b] mb-1 block">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="px-3 py-1.5 border border-[#e0ddd4] rounded-lg text-[14px]"
            >
              <option value="all">All Platforms</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>
          <div>
            <label className="text-[12px] text-[#6b6b6b] mb-1 block">Batch Size</label>
            <select
              value={batchCount}
              onChange={(e) => setBatchCount(parseInt(e.target.value))}
              className="px-3 py-1.5 border border-[#e0ddd4] rounded-lg text-[14px]"
            >
              <option value="3">3 Hooks</option>
              <option value="5">5 Hooks</option>
              <option value="10">10 Hooks</option>
            </select>
          </div>
        </div>
      </div>

      <CB4Chat {...props} systemPrompt={enhancedSystemPrompt} />
    </div>
  )
}
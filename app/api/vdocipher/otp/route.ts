// app/api/vdocipher/otp/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { videoId } = await req.json()

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID required' }, { status: 400 })
    }

    const VDOCIPHER_API_KEY = process.env.VDOCIPHER_API_KEY

    if (!VDOCIPHER_API_KEY) {
      return NextResponse.json({ error: 'VdoCipher API key not configured' }, { status: 500 })
    }

    // Call VdoCipher API to get OTP
    const response = await fetch(`https://dev.vdocipher.com/api/videos/${videoId}/otp`, {
      method: 'POST',
      headers: {
        'Authorization': `Apisecret ${VDOCIPHER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ttl: 300 // 5 minutes
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('VdoCipher API error:', error)
      return NextResponse.json({ error: 'Failed to get playback info' }, { status: 500 })
    }

    const data = await response.json()

    return NextResponse.json({
      otp: data.otp,
      playbackInfo: data.playbackInfo
    })

  } catch (error: any) {
    console.error('VdoCipher OTP error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
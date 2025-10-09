import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // This endpoint receives callbacks from n8n
    // Store or process the response as needed

    return NextResponse.json({ success: true, data: body })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
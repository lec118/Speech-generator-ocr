import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

const requestSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  text: z.string().min(1, "Text is required"),
  language: z.enum(["ko", "en", "zh", "vi"]).default("ko")
});

export async function POST(req: NextRequest) {
  const parsed = requestSchema.safeParse(await req.json());

  if (!parsed.success) {
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        error: "Invalid request payload",
        ...(isDev ? { issues: parsed.error.format() } : {})
      },
      { status: 400 }
    );
  }

  const { apiKey, text, language } = parsed.data;

  // OpenAI TTS has a 4096 character limit
  if (text.length > 4096) {
    return NextResponse.json(
      { error: "텍스트가 너무 깁니다. 4096자 이하로 줄여주세요." },
      { status: 400 }
    );
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined
  });

  try {
    // Use OpenAI TTS API with nova voice (friendly and warm)
    // tts-1 is optimized for real-time, lower latency
    const mp3 = await client.audio.speech.create({
      model: "tts-1",
      voice: "nova", // Nova is a warm, friendly female voice
      input: text,
      speed: 1.0,
      response_format: "mp3" // MP3 is smaller and faster than other formats
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("TTS error:", error);
    const errorMessage = error?.message || "TTS generation failed";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

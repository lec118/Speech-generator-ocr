import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

const requestSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  content: z.string().min(1, "Content is required"),
  targetLanguage: z.enum(["english", "chinese", "vietnamese"]),
  context: z.string().optional()
});

const LANGUAGE_NAMES = {
  english: "English",
  chinese: "Chinese (Simplified)",
  vietnamese: "Vietnamese"
};

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

  const { apiKey, content, targetLanguage, context } = parsed.data;

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined
  });

  const languageName = LANGUAGE_NAMES[targetLanguage];
  const systemPrompt = `You are a professional translator. Translate the given Korean text to ${languageName}.

Important guidelines:
- Translate based on context and meaning, not word-by-word
- Maintain the tone and style of the original text
- PRESERVE ALL MARKDOWN FORMATTING (**, -, bullet points, line breaks, etc.) EXACTLY as in the original
- Keep the markdown structure intact, only translate the actual text content
- Keep technical terms and product names accurate
- Ensure natural flow in the target language
- If the text contains "- **제목:**", translate it to the appropriate format in the target language (e.g., "- **Title:**" for English, "- **标题:**" for Chinese, "- **Tiêu đề:**" for Vietnamese)`;

  const userPrompt = context
    ? `Context: ${context}\n\nTranslate the following Korean text to ${languageName}:\n\n${content}`
    : `Translate the following Korean text to ${languageName}:\n\n${content}`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.3
    });

    const translatedContent = response.choices[0]?.message?.content?.trim();

    if (!translatedContent) {
      return NextResponse.json(
        { error: "Empty translation received" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      translatedContent,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0
      }
    });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}

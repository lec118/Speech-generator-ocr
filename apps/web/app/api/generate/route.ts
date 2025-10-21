import { DEFAULT_STYLE_PROMPT, STYLE_PROMPT_VERSION, buildPrompt, estimateUsageCost } from "@repo/core";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

const MODEL = "gpt-4o-mini";
const MAX_TOKENS = 800;

const requestSchema = z.object({
  topic: z.string().trim().optional().default(""),
  pages: z
    .array(
      z.object({
        pageIndex: z.number().int().nonnegative(),
        pageText: z.string().min(1)
      })
    )
    .min(1),
  options: z
    .object({
      length: z.enum(["short", "medium", "long"]).default("medium"),
      tone: z.enum(["basic", "persuasive", "explanatory", "bullet"]).default("basic")
    })
    .default({
      length: "medium",
      tone: "basic"
    })
});

const MODEL_PRICING = {
  inputPerThousandTokens: 0.00015,
  outputPerThousandTokens: 0.0006
};

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY. Set it in your environment to enable generation." },
      { status: 500 }
    );
  }

  const parsed = requestSchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload", issues: parsed.error.format() }, { status: 400 });
  }

  const { topic, pages, options } = parsed.data;

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined
  });

  const outputs: Array<{ pageIndex: number; content: string }> = [];
  const usage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0
  };

  for (const page of pages) {
    const prompt = buildPrompt({
      topic,
      pageIndex: page.pageIndex,
      pageText: page.pageText,
      length: options.length,
      tone: options.tone
    });

    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: "system",
          content: `${DEFAULT_STYLE_PROMPT}\n\nPrompt-Version: ${STYLE_PROMPT_VERSION}`
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json(
        { error: `Empty completion received for page ${page.pageIndex + 1}` },
        { status: 502 }
      );
    }

    outputs.push({
      pageIndex: page.pageIndex,
      content
    });

    if (response.usage) {
      usage.promptTokens += response.usage.prompt_tokens ?? 0;
      usage.completionTokens += response.usage.completion_tokens ?? 0;
      usage.totalTokens += response.usage.total_tokens ?? 0;
    }
  }

  const cost = estimateUsageCost(
    {
      inputTokens: usage.promptTokens,
      outputTokens: usage.completionTokens
    },
    MODEL_PRICING
  );

  return NextResponse.json({
    outputs,
    usage,
    cost
  });
}

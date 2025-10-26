import { DEFAULT_STYLE_PROMPT, STYLE_PROMPT_VERSION, buildPrompt, estimateUsageCost } from "@repo/core";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

const MODEL = "gpt-4o-mini";
const MAX_TOKENS = 800;
const DAILY_PAGE_LIMIT = parseInt(process.env.DAILY_PAGE_LIMIT || "200", 10);
const CONCURRENCY_HINT = parseInt(process.env.CONCURRENCY_HINT || "10", 10);

const requestSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  topic: z.string().trim().optional().default(""),
  pages: z
    .array(
      z.object({
        pageIndex: z.number().int().nonnegative(),
        imageDataUrl: z.string().min(1)
      })
    )
    .min(1),
  options: z.object({
    length: z.enum(["short", "standard", "long"]).default("standard"),
    tone: z.enum(["friendly", "advertisement", "warStyle"]).default("friendly"),
    delivery: z.enum(["empathy", "friendly", "expert"]).default("empathy")
  })
});

const MODEL_PRICING = {
  inputPerThousandTokens: 0.00015,
  outputPerThousandTokens: 0.0006
};

export async function POST(req: NextRequest) {
  const parsed = requestSchema.safeParse(await req.json());

  if (!parsed.success) {
    // In production, don't expose detailed validation errors
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        error: "Invalid request payload",
        ...(isDev ? { issues: parsed.error.format() } : {})
      },
      { status: 400 }
    );
  }

  const { apiKey, topic, pages, options } = parsed.data;

  // Environment guard: check daily page limit
  if (pages.length > DAILY_PAGE_LIMIT) {
    return NextResponse.json(
      {
        error: `Request exceeds DAILY_PAGE_LIMIT (${DAILY_PAGE_LIMIT} pages). You requested ${pages.length} pages.`,
        hint: `Consider processing in batches or contact admin to increase limit.`
      },
      { status: 429 }
    );
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined
  });

  const outputs: Array<{ pageIndex: number; content: string }> = [];
  const errors: Array<{ pageIndex: number; error: string }> = [];
  const usage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0
  };

  for (const page of pages) {
    try {
      const prompt = buildPrompt({
        topic,
        pageIndex: page.pageIndex,
        length: options.length,
        tone: options.tone,
        delivery: options.delivery
      });

      const systemMessage = `${DEFAULT_STYLE_PROMPT}\n\nPrompt-Version: ${STYLE_PROMPT_VERSION}`;
      const userContent = [
        {
          type: "text" as const,
          text: prompt
        },
        {
          type: "image_url" as const,
          image_url: { url: page.imageDataUrl }
        }
      ];

      const response = await client.chat.completions.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [
          {
            role: "system",
            content: systemMessage
          },
          {
            role: "user",
            content: userContent
          }
        ],
        timeout: 60000 // 60 second timeout per request
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        errors.push({
          pageIndex: page.pageIndex,
          error: "Empty response from API"
        });
        continue;
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
    } catch (error) {
      console.error(`Error processing page ${page.pageIndex + 1}:`, error);

      let errorMessage = "Unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "object" && error !== null && "error" in error) {
        const apiError = error as { error?: { message?: string } };
        errorMessage = apiError.error?.message || "API error";
      }

      errors.push({
        pageIndex: page.pageIndex,
        error: errorMessage
      });

      // Continue processing remaining pages instead of failing completely
      continue;
    }
  }

  // If all pages failed, return error
  if (outputs.length === 0 && errors.length > 0) {
    return NextResponse.json(
      {
        error: "All pages failed to generate",
        details: errors
      },
      { status: 500 }
    );
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
    errors: errors.length > 0 ? errors : undefined,
    usage,
    cost,
    meta: {
      length: options.length,
      tone: options.tone,
      delivery: options.delivery,
      version: STYLE_PROMPT_VERSION,
      limits: {
        dailyPageLimit: DAILY_PAGE_LIMIT,
        concurrencyHint: CONCURRENCY_HINT
      },
      stats: {
        total: pages.length,
        successful: outputs.length,
        failed: errors.length
      }
    }
  });
}

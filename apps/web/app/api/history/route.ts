import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

const HISTORY_KEY_PREFIX = "history";
const HISTORY_LIST_KEY = "history:list";
const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60; // 7일

interface HistoryItem {
  id: string;
  timestamp: number;
  topic: string;
  language: string;
  pageCount: number;
  results: Array<{
    pageIndex: number;
    korean: string;
    translated?: string;
  }>;
}

// GET: 히스토리 리스트 조회
export async function GET() {
  try {
    // 히스토리 ID 리스트 가져오기
    const historyIds = (await kv.get<string[]>(HISTORY_LIST_KEY)) || [];

    // 각 ID별로 데이터 가져오기
    const histories: HistoryItem[] = [];
    for (const id of historyIds) {
      const item = await kv.get<HistoryItem>(`${HISTORY_KEY_PREFIX}:${id}`);
      if (item) {
        histories.push(item);
      }
    }

    // 최신순 정렬
    histories.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({ histories });
  } catch (error) {
    console.error("Failed to fetch history:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}

// POST: 히스토리 저장
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      topic?: string;
      language?: string;
      results: Array<{
        pageIndex: number;
        korean: string;
        translated?: string;
      }>;
    };
    const { topic, language, results } = body;

    if (!results || !Array.isArray(results)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // 고유 ID 생성 (타임스탬프 기반)
    const timestamp = Date.now();
    const id = `${timestamp}`;

    const historyItem: HistoryItem = {
      id,
      timestamp,
      topic: topic || "제목 없음",
      language: language || "none",
      pageCount: results.length,
      results
    };

    // 히스토리 아이템 저장 (7일 후 자동 삭제)
    await kv.set(
      `${HISTORY_KEY_PREFIX}:${id}`,
      historyItem,
      { ex: SEVEN_DAYS_IN_SECONDS }
    );

    // 히스토리 ID 리스트에 추가
    const historyIds = (await kv.get<string[]>(HISTORY_LIST_KEY)) || [];
    historyIds.push(id);

    // 최대 50개까지만 유지 (너무 많아지면 오래된 것 삭제)
    if (historyIds.length > 50) {
      const removedId = historyIds.shift();
      if (removedId) {
        await kv.del(`${HISTORY_KEY_PREFIX}:${removedId}`);
      }
    }

    // 업데이트된 리스트 저장 (7일 후 자동 삭제)
    await kv.set(HISTORY_LIST_KEY, historyIds, { ex: SEVEN_DAYS_IN_SECONDS });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Failed to save history:", error);
    return NextResponse.json(
      { error: "Failed to save history" },
      { status: 500 }
    );
  }
}

// DELETE: 특정 히스토리 삭제
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 }
      );
    }

    // 히스토리 아이템 삭제
    await kv.del(`${HISTORY_KEY_PREFIX}:${id}`);

    // 리스트에서도 제거
    const historyIds = (await kv.get<string[]>(HISTORY_LIST_KEY)) || [];
    const updatedIds = historyIds.filter((historyId) => historyId !== id);
    await kv.set(HISTORY_LIST_KEY, updatedIds, { ex: SEVEN_DAYS_IN_SECONDS });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete history:", error);
    return NextResponse.json(
      { error: "Failed to delete history" },
      { status: 500 }
    );
  }
}

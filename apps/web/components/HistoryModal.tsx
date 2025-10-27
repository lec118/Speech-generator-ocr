"use client";

import { useEffect, useState } from "react";

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

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: HistoryItem) => void;
}

export function HistoryModal({ isOpen, onClose, onSelect }: HistoryModalProps) {
  const [histories, setHistories] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchHistories();
    }
  }, [isOpen]);

  const fetchHistories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/history");
      if (!response.ok) {
        throw new Error("Failed to fetch histories");
      }
      const data = await response.json();
      setHistories(data.histories || []);
    } catch (err) {
      console.error(err);
      setError("히스토리를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("이 히스토리를 삭제하시겠습니까?")) {
      return;
    }

    try {
      const response = await fetch(`/api/history?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete history");
      }
      // 목록에서 제거
      setHistories((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error(err);
      alert("삭제에 실패했습니다.");
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `오늘 ${date.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else if (diffDays === 1) {
      return `어제 ${date.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      return date.toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">최근 생성 결과</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="text-center py-8 text-gray-500">
              불러오는 중...
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-500">
              {error}
            </div>
          )}

          {!loading && !error && histories.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              저장된 히스토리가 없습니다.
            </div>
          )}

          {!loading && !error && histories.length > 0 && (
            <div className="space-y-3">
              {histories.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className="border rounded-lg p-4 hover:bg-purple-50 hover:border-purple-300 cursor-pointer transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {item.topic}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>{formatDate(item.timestamp)}</span>
                        <span>•</span>
                        <span>{item.pageCount}페이지</span>
                        {item.language !== "none" && (
                          <>
                            <span>•</span>
                            <span>
                              {item.language === "english"
                                ? "영어"
                                : item.language === "japanese"
                                ? "일어"
                                : item.language === "chinese"
                                ? "중국어"
                                : ""}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 text-center text-sm text-gray-500">
          히스토리는 7일간 보관됩니다
        </div>
      </div>
    </div>
  );
}

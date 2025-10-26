import { useEffect } from "react";
import { Button, Input } from "@repo/ui";

export interface RangeModalProps {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  parsedPages: number[] | null;
  pageCount: number;
  errorMessage: string | null;
  loading: boolean;
}

export function RangeModal({
  open,
  value,
  onChange,
  onClose,
  onConfirm,
  parsedPages,
  pageCount,
  errorMessage,
  loading
}: RangeModalProps) {
  // Handle ESC key to close modal
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div
        className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="range-modal-title"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 id="range-modal-title" className="text-lg font-semibold text-gray-900">
              생성할 페이지 범위
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              예: 1,3,5 또는 2-4 (입력하지 않으면 전체 페이지)
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="mt-6 space-y-3">
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={`전체 ${pageCount}페이지 범위 내에서 입력`}
            className="h-12 font-mono"
          />
          <p className="text-xs text-gray-500">
            {parsedPages && parsedPages.length > 0
              ? `선택된 페이지: ${parsedPages.join(", ")} (총 ${parsedPages.length}페이지)`
              : value
                ? "올바른 형식으로 입력해주세요."
                : "입력하지 않으면 전체 페이지가 생성됩니다."}
          </p>
          {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="px-4 text-black">
            취소
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="px-4">
            {loading ? "생성 중..." : "생성 시작"}
          </Button>
        </div>
      </div>
    </div>
  );
}

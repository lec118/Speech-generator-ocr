import { Button } from "@repo/ui";

export interface OptionActionsCardProps {
  disabled: boolean;
  pageCount: number;
  isPdf: boolean;
  onGenerateAll: () => void;
  onOpenRangeModal: () => void;
  hasResult: boolean;
  onOpenLastResult: () => void;
  errorMessage: string | null;
}

export function OptionActionsCard({
  disabled,
  pageCount,
  isPdf,
  onGenerateAll,
  onOpenRangeModal,
  errorMessage
}: OptionActionsCardProps) {
  return (
    <section className="relative mx-auto w-full max-w-3xl rounded-3xl bg-gray-100 px-6 py-8 shadow-inner">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          onClick={onGenerateAll}
          disabled={disabled || pageCount === 0}
          className="h-12 flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-base font-semibold text-white shadow-md hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg active:scale-95 disabled:from-gray-400 disabled:to-gray-500"
          data-testid="btn-generate-all"
        >
          전체 생성
        </Button>
        <button
          onClick={onOpenRangeModal}
          disabled={disabled || !isPdf || pageCount === 0}
          className="inline-flex h-12 flex-1 items-center justify-center rounded-md border border-white bg-white px-4 py-2 text-base font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
          data-testid="btn-generate-selected"
        >
          선택하기
        </button>
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
          ⚠️ {errorMessage}
        </div>
      )}
    </section>
  );
}

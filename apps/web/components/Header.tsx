import { Button, Input } from "@repo/ui";

interface HeaderProps {
  showApiSettings: boolean;
  apiKeyInput: string;
  onToggleSettings: () => void;
  onApiKeyInputChange: (value: string) => void;
  onSaveApiKey: () => void;
  onRemoveApiKey: () => void;
  onTitleClick?: () => void;
  totalCostKRW?: number;
  estimatedCostKRW?: number;
  onResetCost?: () => void;
}

export function Header({
  showApiSettings,
  apiKeyInput,
  onToggleSettings,
  onApiKeyInputChange,
  onSaveApiKey,
  onRemoveApiKey,
  onTitleClick,
  totalCostKRW,
  estimatedCostKRW,
  onResetCost
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-8">
        <button
          type="button"
          onClick={onTitleClick}
          className="flex items-center gap-4 rounded-xl bg-transparent text-left transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
            <span className="text-2xl">📄</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              화법Gen
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500">Powered by OpenAI</p>
              {totalCostKRW !== undefined && totalCostKRW > 0 ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-green-600">
                    · 총 사용: ₩{totalCostKRW.toLocaleString()}
                  </span>
                  {onResetCost && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("총 사용 비용을 초기화하시겠습니까?")) {
                          onResetCost();
                        }
                      }}
                      className="ml-1 text-xs text-gray-400 hover:text-red-500"
                      title="비용 초기화"
                    >
                      ↺
                    </button>
                  )}
                </div>
              ) : estimatedCostKRW !== undefined && estimatedCostKRW > 0 ? (
                <span className="text-xs font-medium text-blue-600">
                  · 예상: ~₩{estimatedCostKRW}
                </span>
              ) : null}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-3">
          <Button
            onClick={onToggleSettings}
            variant="ghost"
            className="h-10 w-10 rounded-full text-gray-600 hover:bg-gray-100"
          >
            ⚙️
          </Button>
        </div>
      </div>
      {showApiSettings && (
        <div className="border-t border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-8 py-4">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">OpenAI API Key:</span>
            <Input
              type="password"
              value={apiKeyInput}
              onChange={(event) => onApiKeyInputChange(event.target.value)}
              placeholder="sk-..."
              className="flex-1 border-gray-300"
            />
            <Button
              onClick={onSaveApiKey}
              className="bg-gradient-to-r from-green-500 to-green-600 font-semibold text-white shadow-sm hover:from-green-600 hover:to-green-700"
            >
              저장
            </Button>
            <Button
              onClick={onRemoveApiKey}
              variant="outline"
              className="border-red-300 font-semibold text-red-600 hover:bg-red-50"
            >
              삭제
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@repo/ui";

interface ApiKeyScreenProps {
  apiKeyInput: string;
  onApiKeyInputChange: (value: string) => void;
  onSave: () => void;
}

export function ApiKeyScreen({ apiKeyInput, onApiKeyInputChange, onSave }: ApiKeyScreenProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && apiKeyInput.trim()) {
      onSave();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="space-y-4 pb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-3xl shadow-xl">
            🔑
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">API 키 입력</CardTitle>
            <p className="mt-2 text-sm text-gray-500">OpenAI API 키를 입력하여 시작하세요</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="password"
            value={apiKeyInput}
            onChange={(e) => onApiKeyInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="sk-..."
            className="h-12"
            autoFocus
          />
          <Button
            onClick={onSave}
            disabled={!apiKeyInput.trim()}
            className="h-12 w-full text-base font-semibold"
          >
            시작하기
          </Button>
          <div className="space-y-2">
            <div className="rounded-lg bg-indigo-50/50 p-3 text-xs text-gray-600">
              💡 브라우저에만 저장됩니다 (서버로 전송되지 않음)
            </div>
            <div className="rounded-lg bg-amber-50/80 border border-amber-200 p-3 text-xs text-amber-800">
              ⚠️ 보안 주의: API 키는 브라우저 localStorage에 평문으로 저장됩니다. 공용 컴퓨터에서는 사용을 권장하지 않습니다.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

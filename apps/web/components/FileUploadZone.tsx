import { Button } from "@repo/ui";

interface FileUploadZoneProps {
  dragActive: boolean;
  parsing: boolean;
  ocrProgress: number;
  selectedFile: File | null;
  errorMessage: string | null;
  onDrag: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (input: HTMLInputElement) => void;
  fileInputId: string;
}

export function FileUploadZone({
  dragActive,
  parsing,
  ocrProgress,
  selectedFile,
  errorMessage,
  onDrag,
  onDrop,
  onFileSelect,
  fileInputId
}: FileUploadZoneProps) {
  if (selectedFile && !parsing) {
    return null;
  }

  return (
    <>
      <div
        className={`rounded-2xl border-2 border-dashed p-20 text-center transition-all duration-300 ${
          dragActive
            ? 'scale-105 border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-xl'
            : 'border-gray-300 bg-gradient-to-br from-gray-50 to-white shadow-lg hover:border-indigo-400 hover:shadow-xl'
        }`}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
        data-testid="file-input"
      >
        {parsing ? (
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="h-20 w-20 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">🌀</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xl font-bold text-gray-800">
                {ocrProgress > 0 ? `페이지 렌더링 중... ${ocrProgress}%` : 'GPT Vision 준비 중입니다...'}
              </p>
              <p className="text-sm text-gray-500">잠시만 기다려 주세요. 페이지 이미지를 전처리하고 있어요.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl">
              <span className="text-5xl">📁</span>
            </div>
            <div className="space-y-2 text-gray-800">
              <p className="text-2xl font-bold">파일을 드래그하거나 클릭해서 업로드하세요</p>
              <p className="text-sm font-medium text-gray-500">
                지원 형식: <span className="text-indigo-600">PDF, JPG, PNG</span>
              </p>
            </div>
            <Button
              onClick={() => document.getElementById(fileInputId)?.click()}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-3 text-base font-semibold shadow-lg hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl active:scale-95"
            >
              파일 선택하기
            </Button>
            <input
              id={fileInputId}
              type="file"
              accept=".pdf,image/*"
              onChange={(event) => event.target && onFileSelect(event.target)}
              style={{ display: 'none' }}
            />
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">⚠️ {errorMessage}</div>
      )}
    </>
  );
}

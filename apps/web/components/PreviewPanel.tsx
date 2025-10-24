import { useEffect, useState } from "react";
import type { PageData } from "@repo/core";
import type { FileType } from "../hooks/useFilePreview";

interface PreviewPanelProps {
  selectedFile: File | null;
  fileType: FileType;
  pages: PageData[];
  currentPageIndex?: number;
}

export function PreviewPanel({ selectedFile, fileType, pages, currentPageIndex }: PreviewPanelProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [zoomLevels, setZoomLevels] = useState<Record<number, number>>({});
  const [isDragging, setIsDragging] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState<Record<number, { x: number; y: number }>>({});

  useEffect(() => {
    if (selectedFile && fileType === "image") {
      const url = URL.createObjectURL(selectedFile);
      setImageUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setImageUrl(null);
      };
    }
    return undefined;
  }, [selectedFile, fileType]);

  const hasPages = pages.length > 0;

  // Filter to show only current page if specified
  const displayPages = currentPageIndex !== undefined
    ? pages.filter(page => page.index === currentPageIndex)
    : (fileType === "image" ? pages.slice(0, 1) : pages);

  const getZoomLevel = (pageIndex: number) => zoomLevels[pageIndex] || 1;
  const getOffset = (pageIndex: number) => dragOffset[pageIndex] || { x: 0, y: 0 };

  const handleZoomIn = (pageIndex: number) => {
    setZoomLevels(prev => ({
      ...prev,
      [pageIndex]: Math.min((prev[pageIndex] || 1) + 0.25, 3)
    }));
  };

  const handleZoomOut = (pageIndex: number) => {
    setZoomLevels(prev => ({
      ...prev,
      [pageIndex]: Math.max((prev[pageIndex] || 1) - 0.25, 0.5)
    }));
  };

  const handleZoomReset = (pageIndex: number) => {
    setZoomLevels(prev => ({
      ...prev,
      [pageIndex]: 1
    }));
    setDragOffset(prev => ({
      ...prev,
      [pageIndex]: { x: 0, y: 0 }
    }));
  };

  const handleMouseDown = (pageIndex: number, e: React.MouseEvent) => {
    const zoom = getZoomLevel(pageIndex);
    if (zoom > 1) {
      setIsDragging(pageIndex);
      const offset = getOffset(pageIndex);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging !== null) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setDragOffset(prev => ({
        ...prev,
        [isDragging]: { x: newX, y: newY }
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  if (!hasPages) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-gray-500">
        원본 페이지를 업로드하면 자동으로 미리보기가 표시됩니다.
      </div>
    );
  }

  return (
    <div className={`grid gap-6 ${fileType === "image" ? "w-full" : "w-full"}`}>
      {displayPages.map((page) => {
        const zoom = getZoomLevel(page.index);
        const offset = getOffset(page.index);
        return (
          <div key={page.index} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 bg-slate-50 px-4 py-2 flex-shrink-0">
              <span className="text-xs font-semibold text-indigo-600">페이지 {page.index + 1}</span>
              <div className="flex items-center gap-2">
                <span className="text-lg">🔍</span>
                <button
                  onClick={() => handleZoomIn(page.index)}
                  className="rounded p-1 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                  disabled={zoom >= 3}
                  aria-label="확대"
                  title="확대"
                >
                  +
                </button>
                <button
                  onClick={() => handleZoomOut(page.index)}
                  className="rounded p-1 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                  disabled={zoom <= 0.5}
                  aria-label="축소"
                  title="축소"
                >
                  −
                </button>
                <button
                  onClick={() => handleZoomReset(page.index)}
                  className="rounded p-1 text-xs text-gray-600 hover:bg-gray-200 transition-colors"
                  aria-label="초기화"
                  title="초기화"
                >
                  ↺
                </button>
                <span className="text-xs text-gray-500">{Math.round(zoom * 100)}%</span>
              </div>
            </div>
            <div
              className="flex justify-center items-center bg-gray-50 p-6 overflow-hidden relative flex-1"
              style={{ cursor: zoom > 1 ? (isDragging === page.index ? 'grabbing' : 'grab') : 'default' }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img
                src={page.imageDataUrl}
                alt={`페이지 ${page.index + 1} 미리보기`}
                className="rounded-lg border border-gray-200 object-contain shadow-sm select-none max-w-full max-h-full w-auto h-auto"
                style={{
                  transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
                  transformOrigin: 'center',
                  transition: isDragging === page.index ? 'none' : 'transform 0.1s ease-out'
                }}
                onMouseDown={(e) => handleMouseDown(page.index, e)}
                draggable={false}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

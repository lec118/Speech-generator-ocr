import { useState } from "react";

export type FileType = "pdf" | "image" | null;

export interface UseFilePreviewReturn {
  selectedFile: File | null;
  fileType: FileType;
  showPreview: boolean;
  pageInput: string;
  setSelectedFile: (file: File | null) => void;
  setFileType: (type: FileType) => void;
  setShowPreview: (show: boolean) => void;
  setPageInput: (input: string) => void;
  handleFileSelection: (file: File) => void;
  reset: () => void;
}

/**
 * Custom hook for managing file selection and preview state
 */
export function useFilePreview(): UseFilePreviewReturn {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [pageInput, setPageInput] = useState("");

  const handleFileSelection = (file: File) => {
    setSelectedFile(file);
    const isPdf = file.type === "application/pdf";
    setFileType(isPdf ? "pdf" : "image");
    setShowPreview(false); // Don't show preview until generation completes
    setPageInput(""); // Reset page input
  };

  const reset = () => {
    setSelectedFile(null);
    setFileType(null);
    setShowPreview(false);
    setPageInput("");
  };

  return {
    selectedFile,
    fileType,
    showPreview,
    pageInput,
    setSelectedFile,
    setFileType,
    setShowPreview,
    setPageInput,
    handleFileSelection,
    reset
  };
}

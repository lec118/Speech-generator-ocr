import { useState, useEffect } from "react";

const STORAGE_KEY = "openai_api_key";

export interface UseApiKeyReturn {
  apiKey: string;
  apiKeyInput: string;
  showSettings: boolean;
  setApiKeyInput: (key: string) => void;
  setShowSettings: (show: boolean) => void;
  saveApiKey: () => void;
  removeApiKey: () => void;
  hasApiKey: boolean;
}

/**
 * Custom hook for managing API key with localStorage persistence
 */
export function useApiKey(): UseApiKeyReturn {
  const [apiKey, setApiKey] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // Load API key from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setApiKey(saved);
      setApiKeyInput(saved);
    }
  }, []);

  const saveApiKey = () => {
    const trimmedKey = apiKeyInput.trim();
    if (trimmedKey) {
      localStorage.setItem(STORAGE_KEY, trimmedKey);
      setApiKey(trimmedKey);
      setShowSettings(false);
    }
  };

  const removeApiKey = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey("");
    setApiKeyInput("");
  };

  return {
    apiKey,
    apiKeyInput,
    showSettings,
    setApiKeyInput,
    setShowSettings,
    saveApiKey,
    removeApiKey,
    hasApiKey: !!apiKey
  };
}

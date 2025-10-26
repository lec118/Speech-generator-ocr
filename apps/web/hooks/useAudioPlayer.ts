import { useState, useRef, useCallback, useEffect } from "react";
import { generateTTS, createAudioFromBlob, stopAllAudio } from "../lib/tts-api";

export interface UseAudioPlayerOptions {
  apiKey: string;
  language: string;
  enabled: boolean;
}

export interface UseAudioPlayerReturn {
  isPlaying: boolean;
  isLoading: boolean;
  play: (text: string, pageIndex: number) => Promise<void>;
  stop: () => void;
  cleanup: () => void;
}

/**
 * Custom hook for managing audio playback with caching and preloading
 */
export function useAudioPlayer({ apiKey, language, enabled }: UseAudioPlayerOptions): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioCacheRef = useRef<Record<number, HTMLAudioElement>>({});

  /**
   * Attach event handlers to audio element
   */
  const attachAudioHandlers = useCallback((audio: HTMLAudioElement) => {
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => setIsPlaying(false);
  }, []);

  /**
   * Preload audio for a specific page
   */
  const preloadAudio = useCallback(async (text: string, pageIndex: number) => {
    if (!text.trim() || !enabled || !apiKey) return;
    if (audioCacheRef.current[pageIndex]) return; // Already cached

    try {
      const audioBlob = await generateTTS({
        apiKey,
        text,
        language
      });

      const audio = createAudioFromBlob(audioBlob);
      attachAudioHandlers(audio);

      // Preload the audio
      audio.load();
      audioCacheRef.current[pageIndex] = audio;
    } catch (error) {
      console.error("Preload error:", error);
    }
  }, [apiKey, language, enabled, attachAudioHandlers]);

  /**
   * Play audio for a specific page
   */
  const play = useCallback(async (text: string, pageIndex: number) => {
    if (!text.trim()) return;

    const cachedAudio = audioCacheRef.current[pageIndex];

    // If already playing, stop it
    if (isPlaying) {
      if (cachedAudio) {
        cachedAudio.pause();
        cachedAudio.currentTime = 0;
      }
      setIsPlaying(false);
      return;
    }

    try {
      // If audio is already preloaded, play it immediately
      if (cachedAudio) {
        setIsPlaying(true);
        cachedAudio.currentTime = 0;
        await cachedAudio.play();
        return;
      }

      // Otherwise, load it now
      setIsLoading(true);

      const audioBlob = await generateTTS({
        apiKey,
        text,
        language
      });

      const audio = createAudioFromBlob(audioBlob);
      attachAudioHandlers(audio);

      audioCacheRef.current[pageIndex] = audio;
      setIsLoading(false);
      setIsPlaying(true);
      await audio.play();
    } catch (error) {
      console.error("TTS error:", error);
      setIsLoading(false);
      setIsPlaying(false);
      throw error;
    }
  }, [apiKey, language, isPlaying, attachAudioHandlers]);

  /**
   * Stop all audio playback
   */
  const stop = useCallback(() => {
    stopAllAudio(audioCacheRef.current);
    setIsPlaying(false);
  }, []);

  /**
   * Cleanup all audio resources
   */
  const cleanup = useCallback(() => {
    stopAllAudio(audioCacheRef.current);
    audioCacheRef.current = {};
    setIsPlaying(false);
  }, []);

  return {
    isPlaying,
    isLoading,
    play,
    stop,
    cleanup
  };
}

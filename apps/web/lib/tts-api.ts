/**
 * TTS API utilities for audio generation
 */

export interface TTSRequest {
  apiKey: string;
  text: string;
  language: string;
}

export interface TTSResponse {
  audioBlob: Blob;
}

/**
 * Calls TTS API to generate audio
 */
export async function generateTTS(request: TTSRequest): Promise<Blob> {
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errorData.error || "TTS failed");
  }

  return await response.blob();
}

/**
 * Creates an Audio element from a Blob
 */
export function createAudioFromBlob(blob: Blob): HTMLAudioElement {
  const audioUrl = URL.createObjectURL(blob);
  const audio = new Audio(audioUrl);

  // Clean up URL when audio ends or errors
  const cleanup = () => URL.revokeObjectURL(audioUrl);
  audio.addEventListener("ended", cleanup);
  audio.addEventListener("error", cleanup);

  return audio;
}

/**
 * Stops and cleans up audio elements
 */
export function stopAndCleanAudio(audio: HTMLAudioElement): void {
  audio.pause();
  audio.currentTime = 0;
}

/**
 * Stops and cleans up multiple audio elements
 */
export function stopAllAudio(audioMap: Record<number, HTMLAudioElement>): void {
  Object.values(audioMap).forEach(stopAndCleanAudio);
}

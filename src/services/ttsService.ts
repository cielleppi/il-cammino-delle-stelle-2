import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Simple in-memory cache for audio URLs
const audioCache: Record<string, string> = {};

// Track currently playing audio and its resolve function to allow stopping it
let currentResolve: (() => void) | null = null;
let currentSpeakId = 0;

// Track pending requests to avoid duplicate calls while fetching
const pendingRequests: Record<string, Promise<string>> = {};

// Global cooldown to handle 429 errors
let globalCooldownUntil = 0;

// Request queue to avoid hitting rate limits with concurrent calls
let requestQueue: (() => Promise<any>)[] = [];
let isProcessingQueue = false;

async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const request = requestQueue.shift();
    if (request) {
      try {
        await request();
        // Add a small delay between requests to be safe
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (e) {
        console.error("ttsService: Queue request failed", e);
      }
    }
  }

  isProcessingQueue = false;
}

function addToQueue<T>(request: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const result = await request();
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });
    processQueue();
  });
}

// Singleton audio element for maximum responsiveness
const globalAudio = typeof window !== 'undefined' ? new Audio() : null;

/**
 * Stops any currently playing or pending narration.
 * Resolves the promise of the active speak() call.
 */
export function stop(): void {
  console.log("ttsService: stop requested");
  currentSpeakId++; // Invalidate any pending fetch/processing
  
  if (globalAudio) {
    globalAudio.pause();
    globalAudio.currentTime = 0;
    // Clear callbacks to prevent old resolves
    globalAudio.onended = null;
    globalAudio.onerror = null;
  }
  
  if (currentResolve) {
    const resolve = currentResolve;
    currentResolve = null;
    resolve();
  }
}

/**
 * Prefetches audio for the given text and stores it in the cache.
 */
export async function prefetch(text: string, retries = 2, backoff = 2000): Promise<void> {
  if (!text || audioCache[text] || pendingRequests[text]) return;
  
  if (Date.now() < globalCooldownUntil) {
    console.warn("ttsService: Global cooldown active, skipping prefetch");
    return;
  }

  pendingRequests[text] = addToQueue(async () => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Dillo in modo etereo e poetico: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio data");

      const pcmData = base64ToUint8Array(base64Audio);
      const wavData = addWavHeader(pcmData, 24000);
      const audioBlob = new Blob([wavData], { type: 'audio/wav' });
      const url = URL.createObjectURL(audioBlob);
      audioCache[text] = url;
      return url;
    } catch (error: any) {
      const errorData = error.response?.data || error;
      const statusCode = error.status || error.code || errorData?.error?.code;

      if (statusCode === 429 || statusCode === "RESOURCE_EXHAUSTED") {
        console.warn("ttsService: Rate limit hit, activating global cooldown");
        globalCooldownUntil = Date.now() + 10000; // 10 second cooldown
      }

      if (retries > 0 && (statusCode === 429 || statusCode === 500 || statusCode === "RESOURCE_EXHAUSTED")) {
        const nextBackoff = statusCode === 429 ? backoff * 2 : backoff;
        await new Promise(r => setTimeout(r, nextBackoff));
        return prefetch(text, retries - 1, nextBackoff).then(() => audioCache[text] || "");
      }

      console.error("ttsService: Prefetch failed", error);
      throw error;
    } finally {
      delete pendingRequests[text];
    }
  });

  try {
    await pendingRequests[text];
  } catch (e) {
    // Error already logged in the queue task
  }
}

/**
 * Narrates the given text using Gemini TTS.
 * Supports interruption via stop().
 */
export async function speak(text: string, retries = 3, backoff = 1000): Promise<void> {
  console.log(`ttsService: speak requested for text: "${text.substring(0, 30)}..."`);
  if (!text || !globalAudio) return;

  // Stop any previous narration before starting a new one
  stop();
  
  const mySpeakId = ++currentSpeakId;

  return new Promise<void>(async (resolve, reject) => {
    currentResolve = resolve;

    if (!process.env.GEMINI_API_KEY) {
      console.warn("ttsService: GEMINI_API_KEY is missing. Narration will be skipped.");
      if (currentSpeakId === mySpeakId) currentResolve = null;
      resolve();
      return;
    }

    try {
      let audioUrl: string;

      if (audioCache[text]) {
        console.log(`ttsService: Using cached audio for: "${text.substring(0, 30)}..."`);
        audioUrl = audioCache[text];
      } else if (pendingRequests[text]) {
        console.log(`ttsService: Waiting for pending request for: "${text.substring(0, 30)}..."`);
        audioUrl = await pendingRequests[text];
      } else {
        console.log(`ttsService: Fetching new audio for: "${text.substring(0, 30)}..."`);
        // Fetch from API (this will also populate cache)
        await prefetch(text);
        audioUrl = audioCache[text];
      }

      // Check if we were interrupted during the fetch/wait
      if (mySpeakId !== currentSpeakId) return;

      if (!audioUrl) throw new Error("Failed to obtain audio URL");

      globalAudio.src = audioUrl;
      
      globalAudio.onended = () => {
        if (mySpeakId === currentSpeakId) {
          currentResolve = null;
          resolve();
        }
      };

      globalAudio.onerror = (e) => {
        console.error("ttsService: Audio playback error", e);
        if (mySpeakId === currentSpeakId) {
          currentResolve = null;
          reject(e);
        }
      };

      // Use play() directly, it's faster than awaiting it if we just want to start
      globalAudio.play().catch(e => {
        console.error("ttsService: Play failed", e);
        if (mySpeakId === currentSpeakId) {
          currentResolve = null;
          resolve();
        }
      });
    } catch (error: any) {
      if (mySpeakId === currentSpeakId) {
        const errorData = error.response?.data || error;
        const statusCode = error.status || error.code || errorData?.error?.code;
        
        if (retries > 0 && (statusCode === 429 || statusCode === 500 || statusCode === "RESOURCE_EXHAUSTED")) {
          const nextBackoff = statusCode === 429 ? backoff * 2 : backoff;
          console.log(`Retrying TTS in ${nextBackoff}ms... (${retries} attempts left)`);
          
          currentResolve = null;
          await new Promise(r => setTimeout(r, nextBackoff));
          
          if (mySpeakId !== currentSpeakId) {
            resolve();
            return;
          }
          
          try {
            await speak(text, retries - 1, nextBackoff);
            resolve();
          } catch (retryError) {
            reject(retryError);
          }
          return;
        }

        console.error("ttsService: Final error", error);
        currentResolve = null;
        resolve(); // Resolve anyway to not block UI
      }
    }
  });
}

function base64ToUint8Array(base64: string) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return byteNumbers;
}

function addWavHeader(pcmData: Uint8Array, sampleRate: number) {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + pcmData.length, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, pcmData.length, true);

  const wavData = new Uint8Array(header.byteLength + pcmData.length);
  wavData.set(new Uint8Array(header), 0);
  wavData.set(pcmData, 44);
  return wavData;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

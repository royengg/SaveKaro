export const VOICE_SEARCH_LANG = "en-IN";
export const VOICE_SILENCE_TIMEOUT_MS = 10_000;

export interface VoiceRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

export interface VoiceRecognitionResultItem {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: VoiceRecognitionAlternative;
}

export interface VoiceRecognitionResultList {
  readonly length: number;
  readonly [index: number]: VoiceRecognitionResultItem;
}

export interface VoiceRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: VoiceRecognitionResultList;
}

export interface VoiceRecognitionErrorEventLike {
  readonly error: string;
  readonly message: string;
}

export interface VoiceRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: VoiceRecognitionEventLike) => void) | null;
  onerror: ((event: VoiceRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type VoiceRecognitionCtor = new () => VoiceRecognitionLike;

export function getSpeechRecognitionCtor(): VoiceRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: VoiceRecognitionCtor;
    webkitSpeechRecognition?: VoiceRecognitionCtor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export interface VoiceTranscriptDelta {
  finalTranscript: string;
  interimTranscript: string;
}

export function extractVoiceTranscriptDelta(
  results: VoiceRecognitionResultList,
  resultIndex: number,
): VoiceTranscriptDelta {
  let finalTranscript = "";
  let interimTranscript = "";

  for (let index = resultIndex; index < results.length; index += 1) {
    const result = results[index];
    if (!result) continue;

    const transcript = result[0]?.transcript ?? "";
    if (result.isFinal) {
      finalTranscript += transcript;
    } else {
      interimTranscript += transcript;
    }
  }

  return {
    finalTranscript: finalTranscript.trim(),
    interimTranscript: interimTranscript.trim(),
  };
}

export function buildVoiceInputValue(
  baseValue: string,
  transcript: string,
): string {
  const base = baseValue.trim();
  const spoken = transcript.trim();

  if (!spoken) return base;
  if (!base) return spoken;
  return `${base} ${spoken}`;
}

export function getVoiceErrorMessage(errorCode: string): string | null {
  switch (errorCode) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked. Allow mic access in your browser settings and try again.";
    case "no-speech":
      return "Didn't catch that. Tap the mic and try speaking again.";
    case "audio-capture":
      return "No microphone was found. Connect a microphone and try again.";
    case "network":
      return "Voice search hit a network error. Check your connection and try again.";
    case "language-not-supported":
      return "Voice search is unavailable for the current language.";
    case "aborted":
      return null;
    default:
      return "Voice search ran into a problem. Please try again.";
  }
}

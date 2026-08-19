import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { captureEvent } from "@/lib/analytics/events";
import {
  VOICE_SILENCE_TIMEOUT_MS,
  VOICE_SEARCH_LANG,
  buildVoiceInputValue,
  extractVoiceTranscriptDelta,
  getSpeechRecognitionCtor,
  getVoiceErrorMessage,
  type VoiceRecognitionLike,
} from "@/lib/voiceSearch";

export interface UseVoiceSearchOptions {
  value: string;
  onChange: (value: string) => void;
}

export interface UseVoiceSearchResult {
  isListening: boolean;
  isSupported: boolean;
  toggleListening: () => void;
  stopListening: () => void;
}

function detachRecognitionHandlers(recognition: VoiceRecognitionLike) {
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;
  recognition.onstart = null;
}

function clearSilenceTimer(timer: { current: number | null }) {
  if (timer.current !== null) {
    window.clearInterval(timer.current);
    timer.current = null;
  }
}

export function useVoiceSearch({
  value,
  onChange,
}: UseVoiceSearchOptions): UseVoiceSearchResult {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(() => getSpeechRecognitionCtor() !== null);

  const recognitionRef = useRef<VoiceRecognitionLike | null>(null);
  const sessionActiveRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const committedFinalRef = useRef("");
  const lastInterimRef = useRef("");
  const errorCodeRef = useRef<string | null>(null);
  const startedAtRef = useRef(0);
  const lastActivityAtRef = useRef(0);
  const silenceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;
      if (recognition) {
        detachRecognitionHandlers(recognition);
        try {
          recognition.abort();
        } catch {
          // Ignore abort failures during teardown.
        }
        recognitionRef.current = null;
      }
      sessionActiveRef.current = false;
      clearSilenceTimer(silenceTimerRef);
    };
  }, []);

  const stopListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    try {
      recognition.stop();
    } catch {
      // stop() can throw if the session never fully started (e.g. stopped
      // while the permission prompt was still open). Tear down manually.
      detachRecognitionHandlers(recognition);
      try {
        recognition.abort();
      } catch {
        // Ignore abort failures.
      }
      recognitionRef.current = null;
      sessionActiveRef.current = false;
      clearSilenceTimer(silenceTimerRef);
      setIsListening(false);
    }
  };

  const startListening = () => {
    if (sessionActiveRef.current) return;

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      toast.error("Voice search is not supported in this browser.");
      return;
    }

    const recognition = new Ctor();
    recognition.lang = VOICE_SEARCH_LANG;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const baseValue = value;
    committedFinalRef.current = "";
    lastInterimRef.current = "";
    errorCodeRef.current = null;
    startedAtRef.current = Date.now();
    lastActivityAtRef.current = Date.now();

    recognition.onstart = () => {
      lastActivityAtRef.current = Date.now();
    };

    recognition.onresult = (event) => {
      lastActivityAtRef.current = Date.now();

      const delta = extractVoiceTranscriptDelta(
        event.results,
        event.resultIndex,
      );
      if (delta.finalTranscript) {
        committedFinalRef.current = [
          committedFinalRef.current,
          delta.finalTranscript,
        ]
          .filter(Boolean)
          .join(" ");
      }
      lastInterimRef.current = delta.interimTranscript;

      const liveTranscript = [
        committedFinalRef.current,
        lastInterimRef.current,
      ]
        .filter(Boolean)
        .join(" ");
      onChangeRef.current(buildVoiceInputValue(baseValue, liveTranscript));
    };

    recognition.onerror = (event) => {
      errorCodeRef.current = event.error;
      const message = getVoiceErrorMessage(event.error);
      if (message) {
        toast.error(message);
        captureEvent("voice_search:error", { error_type: event.error });
      }
    };

    recognition.onend = () => {
      clearSilenceTimer(silenceTimerRef);
      detachRecognitionHandlers(recognition);
      recognitionRef.current = null;
      sessionActiveRef.current = false;
      setIsListening(false);

      const hadError = errorCodeRef.current !== null;
      const transcript = committedFinalRef.current || lastInterimRef.current;

      if (transcript && !hadError) {
        onChangeRef.current(buildVoiceInputValue(baseValue, transcript));
        captureEvent("voice_search:result", {
          transcript_length: transcript.length,
          duration_ms: Date.now() - startedAtRef.current,
        });
      } else {
        // Nothing usable was captured — restore the pre-listening input
        // value so a partial interim transcript does not linger.
        onChangeRef.current(baseValue);
      }
    };

    recognitionRef.current = recognition;
    sessionActiveRef.current = true;
    setIsListening(true);
    captureEvent("voice_search:start", {
      input_had_text: baseValue.trim().length > 0,
    });

    clearSilenceTimer(silenceTimerRef);
    silenceTimerRef.current = window.setInterval(() => {
      if (Date.now() - lastActivityAtRef.current >= VOICE_SILENCE_TIMEOUT_MS) {
        stopListening();
      }
    }, 1000);

    try {
      recognition.start();
    } catch {
      // start() throws if a session is somehow already active on the
      // recognition instance. Reset to a clean idle state.
      clearSilenceTimer(silenceTimerRef);
      detachRecognitionHandlers(recognition);
      recognitionRef.current = null;
      sessionActiveRef.current = false;
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (sessionActiveRef.current) {
      stopListening();
    } else {
      startListening();
    }
  };

  return {
    isListening,
    isSupported,
    toggleListening,
    stopListening,
  };
}

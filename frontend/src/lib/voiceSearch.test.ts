import { describe, expect, it } from "bun:test";
import type { VoiceRecognitionResultItem } from "./voiceSearch";
import {
  buildVoiceInputValue,
  extractVoiceTranscriptDelta,
  getSpeechRecognitionCtor,
  getVoiceErrorMessage,
} from "./voiceSearch";

function makeResult(
  transcript: string,
  isFinal: boolean,
): VoiceRecognitionResultItem {
  return {
    isFinal,
    length: 1,
    0: { transcript, confidence: 0.9 },
  };
}

function makeResults(...items: VoiceRecognitionResultItem[]) {
  return {
    length: items.length,
    ...items,
  };
}

describe("getSpeechRecognitionCtor", () => {
  it("returns null when window is undefined (non-browser environment)", () => {
    expect(getSpeechRecognitionCtor()).toBeNull();
  });
});

describe("extractVoiceTranscriptDelta", () => {
  it("splits final and interim transcripts from the result index", () => {
    const results = makeResults(
      makeResult("running", true),
      makeResult(" shoes", false),
    );

    const delta = extractVoiceTranscriptDelta(results, 0);

    expect(delta.finalTranscript).toBe("running");
    expect(delta.interimTranscript).toBe("shoes");
  });

  it("ignores results before resultIndex", () => {
    const results = makeResults(
      makeResult("old final", true),
      makeResult("new final", true),
    );

    const delta = extractVoiceTranscriptDelta(results, 1);

    expect(delta.finalTranscript).toBe("new final");
    expect(delta.interimTranscript).toBe("");
  });

  it("concatenates multiple finals and interims from the index", () => {
    const results = makeResults(
      makeResult("ignored", true),
      makeResult("nike", true),
      makeResult(" air", true),
      makeResult(" max", false),
      makeResult(" 90", false),
    );

    const delta = extractVoiceTranscriptDelta(results, 1);

    expect(delta.finalTranscript).toBe("nike air");
    expect(delta.interimTranscript).toBe("max 90");
  });

  it("handles an empty result list", () => {
    const results = makeResults();

    const delta = extractVoiceTranscriptDelta(results, 0);

    expect(delta.finalTranscript).toBe("");
    expect(delta.interimTranscript).toBe("");
  });

  it("returns empty transcripts for missing alternatives", () => {
    const sparse: VoiceRecognitionResultItem = {
      isFinal: true,
      length: 0,
    };
    const results = makeResults(sparse);

    const delta = extractVoiceTranscriptDelta(results, 0);

    expect(delta.finalTranscript).toBe("");
    expect(delta.interimTranscript).toBe("");
  });
});

describe("buildVoiceInputValue", () => {
  it("returns the transcript when the base value is empty", () => {
    expect(buildVoiceInputValue("", "nike shoes")).toBe("nike shoes");
  });

  it("appends the transcript to an existing base value", () => {
    expect(buildVoiceInputValue("nike", "running shoes")).toBe(
      "nike running shoes",
    );
  });

  it("returns the base value when the transcript is empty", () => {
    expect(buildVoiceInputValue("nike", "")).toBe("nike");
  });

  it("trims whitespace from both parts", () => {
    expect(buildVoiceInputValue("  nike  ", "  shoes  ")).toBe("nike shoes");
  });

  it("returns an empty string when both parts are empty", () => {
    expect(buildVoiceInputValue("   ", "  ")).toBe("");
  });
});

describe("getVoiceErrorMessage", () => {
  it("maps permission errors to an actionable message", () => {
    expect(getVoiceErrorMessage("not-allowed")).toContain("Microphone");
    expect(getVoiceErrorMessage("service-not-allowed")).toContain(
      "Microphone",
    );
  });

  it("maps no-speech and hardware errors to messages", () => {
    expect(getVoiceErrorMessage("no-speech")).toContain("Didn't catch");
    expect(getVoiceErrorMessage("audio-capture")).toContain("microphone");
    expect(getVoiceErrorMessage("network")).toContain("network");
  });

  it("returns null for aborted sessions (user-initiated stop)", () => {
    expect(getVoiceErrorMessage("aborted")).toBeNull();
  });

  it("falls back to a generic message for unknown codes", () => {
    expect(getVoiceErrorMessage("something-odd")).toContain("try again");
  });
});

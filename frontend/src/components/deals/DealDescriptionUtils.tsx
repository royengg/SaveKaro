import type { ReactNode } from "react";

const DESCRIPTION_URL_PATTERN = /(?<!\()https?:\/\/[^\s)\]<>]+/g;

export function createDescriptionPreview(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  let previewEnd = maxLength;

  for (const match of text.matchAll(DESCRIPTION_URL_PATTERN)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;

    if (start < previewEnd && end > previewEnd) {
      previewEnd = end;
      break;
    }
  }

  return `${text.slice(0, previewEnd).trimEnd()}...`;
}

export function renderLinkedDescription(text: string): ReactNode[] {
  return text.split("\n").map((line, lineIndex) => {
    const parts: ReactNode[] = [];
    let cursor = 0;

    for (const match of line.matchAll(DESCRIPTION_URL_PATTERN)) {
      const url = match[0];
      const start = match.index ?? 0;

      if (start > cursor) {
        parts.push(line.slice(cursor, start));
      }

      parts.push(
        <a
          key={`description-link-${lineIndex}-${start}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all font-medium text-foreground/80 underline decoration-black/15 underline-offset-2 transition-colors hover:text-foreground hover:decoration-black/35"
        >
          {url}
        </a>,
      );

      cursor = start + url.length;
    }

    if (cursor < line.length) {
      parts.push(line.slice(cursor));
    }

    return (
      <span key={`description-line-${lineIndex}`} className="block">
        {parts.length ? parts : "\u00A0"}
      </span>
    );
  });
}

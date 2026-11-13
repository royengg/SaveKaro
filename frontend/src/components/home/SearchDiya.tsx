import { useId } from "react";
import "./search-diya.css";

/** Decorative Diwali diya, anchored where the search bar's seasonal icon sits. */
export function SearchDiya() {
  const id = useId();

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 48 56"
      className="search-diya"
    >
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop stopColor="#ffc34d" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffc34d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-clay`} x1="0" y1="0" x2="0.2" y2="1">
          <stop stopColor="#ec8650" />
          <stop offset="1" stopColor="#ac3e32" />
        </linearGradient>
        <linearGradient id={`${id}-flame`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#ffe99a" />
          <stop offset="0.5" stopColor="#ffc13d" />
          <stop offset="1" stopColor="#f58b25" />
        </linearGradient>
      </defs>
      <ellipse className="search-diya__glow" cx="24" cy="23" rx="24" ry="23" fill={`url(#${id}-glow)`} />
      <ellipse cx="24" cy="51" rx="14" ry="2" fill="#853c22" opacity="0.1" />
      <path d="M5 35Q24 41 43 35C41 45 34 51 24 51S7 45 5 35Z" fill={`url(#${id}-clay)`} />
      <path d="M10 40Q24 48 38 40" fill="none" stroke="#ffcb77" strokeWidth="1.5" strokeLinecap="round" />
      <path d="m21 44 3-2 3 2-3 2Z" fill="#ffe0a0" />
      <circle cx="16" cy="43" r="1" fill="#ffe0a0" />
      <circle cx="32" cy="43" r="1" fill="#ffe0a0" />
      <ellipse cx="24" cy="35" rx="19" ry="5.5" fill="#f5b05a" />
      <ellipse cx="24" cy="35" rx="15.5" ry="3.4" fill="#a9432d" />
      <ellipse cx="24" cy="34.5" rx="12.5" ry="1.9" fill="#eaa043" />
      <path d="m23 35 1-6" stroke="#623d2c" strokeWidth="2.5" strokeLinecap="round" />
      <g className="search-diya__flame">
        <path d="M25 5C26 14 34 18 32 25C31 30 28 33 24 33C19 33 16 29 17 24C18 18 23 15 25 5Z" fill={`url(#${id}-flame)`} />
        <path d="M24 18C24 23 29 25 27 29C26 32 22 32 21 29C20 26 23 23 24 18Z" fill="#fff4c4" />
      </g>
    </svg>
  );
}

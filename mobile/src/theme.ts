export const colors = {
  background: "#fcfcfd",
  surface: "#ffffff",
  text: "#171717",
  muted: "#737373",
  border: "#e5e5e5",
  accent: "#e60023",
  primary: "#171717",
  button: "#181818",
  pink: "#fce8f3",
  cream: "#fff9e8",
  danger: "#b42318",
};

export const pageHighlights = {
  default: ["#f472b6", "#fbbf24"],
  submission: ["#fbbf24", "#38bdf8"],
  settings: ["#fbbf24", "#f472b6"],
} as const;
export type PageTone = keyof typeof pageHighlights;

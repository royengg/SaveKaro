const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "C$",
  AUD: "A$",
  INR: "₹",
};

export function getCurrencySymbol(currency: string = "INR"): string {
  return CURRENCY_SYMBOLS[currency] || "$";
}

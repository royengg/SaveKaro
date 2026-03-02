/**
 * Simple HTML tag stripper for XSS protection.
 * Removes all HTML tags from user-supplied strings.
 * This is a defense-in-depth measure — React escapes text by default,
 * but stripping on save protects against future misuse (e.g. dangerouslySetInnerHTML,
 * email templates, or API consumers that render raw HTML).
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

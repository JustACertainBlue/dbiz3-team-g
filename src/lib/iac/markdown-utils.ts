/**
 * Markdown formatting and HTML sanitization utilities for IAC (In-app Chat).
 * Traces to: spec-IAC.md BR-007 (plain text + bold/italic markdown).
 */

export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderChatMarkdown(text: string): string {
  if (!text) return ''

  // 1. Sanitize raw HTML first to prevent any XSS injection
  let sanitized = sanitizeHtml(text)

  // 2. Bold: **text** -> <strong>text</strong>
  sanitized = sanitized.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // 3. Italic: *text* -> <em>text</em>
  sanitized = sanitized.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // 4. Italic: _text_ -> <em>text</em>
  sanitized = sanitized.replace(/_(.+?)_/g, '<em>$1</em>')

  return sanitized
}


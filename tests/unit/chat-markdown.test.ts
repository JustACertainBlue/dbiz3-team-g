/**
 * T012 — Message formatting, bold/italic parsing, and XSS sanitization (BR-007)
 *
 * CONSTITUTION II: Written BEFORE src/lib/iac/markdown-utils.ts exists.
 * These tests MUST FAIL until T014 is implemented.
 */
import { describe, it, expect } from 'vitest'
import { renderChatMarkdown } from '@/lib/iac/markdown-utils'

describe('T012 | Markdown Rendering & Sanitization (BR-007)', () => {
  it('renders bold markdown **text** to <strong>text</strong>', () => {
    const input = 'We confirm **group size: 15** for the tour'
    const result = renderChatMarkdown(input)
    expect(result).toBe('We confirm <strong>group size: 15</strong> for the tour')
  })

  it('renders italic markdown *text* to <em>text</em>; _text_ stays literal (spec-IAC #20)', () => {
    const asterisks = 'Available on *Saturday morning*'
    expect(renderChatMarkdown(asterisks)).toBe('Available on <em>Saturday morning</em>')

    const underscores = 'Available on _Saturday morning_'
    expect(renderChatMarkdown(underscores)).toBe('Available on _Saturday morning_')
  })

  it('shows every other markup as text (spec-IAC #20)', () => {
    expect(renderChatMarkdown('<b>x</b>')).toBe('&lt;b&gt;x&lt;/b&gt;')
    expect(renderChatMarkdown('# heading [a](b) `code`')).toBe('# heading [a](b) `code`')
    const unclosed = renderChatMarkdown('**not closed')
    expect(unclosed).not.toContain('<strong>')
    expect(unclosed).not.toContain('<em>')
  })

  it('renders combined bold and italic', () => {
    const input = 'Please check **important**: *schedule updated*'
    expect(renderChatMarkdown(input)).toBe(
      'Please check <strong>important</strong>: <em>schedule updated</em>'
    )
  })

  it('sanitizes malicious HTML/script tags to prevent XSS attacks', () => {
    const malicious = '<script>alert("hack")</script> and <img src="x" onerror="steal()">'
    const sanitized = renderChatMarkdown(malicious)
    expect(sanitized).not.toContain('<script>')
    expect(sanitized).toContain('&lt;script&gt;')
    expect(sanitized).not.toContain('<img')
  })

  it('leaves plain text unchanged', () => {
    const plain = 'Hello, can we request an English speaking guide?'
    expect(renderChatMarkdown(plain)).toBe(plain)
  })
})


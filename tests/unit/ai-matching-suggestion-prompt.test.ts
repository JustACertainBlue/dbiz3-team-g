import { describe, expect, it } from 'vitest'
import { additionalSuggestionPrompt } from '@/app/ai-matching/suggestion-prompt'

describe('additional suggestion prompts', () => {
  it('identifies the suggested experience and asks for detail using the current conversation criteria', () => {
    const prompt = additionalSuggestionPrompt({
      experience_name: 'Nghề làm nón lá',
      village_name: 'Làng Chuông',
      provider_name: 'Xưởng thủ công',
    })

    expect(prompt).toContain('Nghề làm nón lá')
    expect(prompt).toContain('Làng Chuông')
    expect(prompt).toContain('tiêu chí của đoàn trong cuộc trò chuyện hiện tại')
    expect(prompt).toContain('hoạt động, thời lượng, sức chứa, chi phí dự kiến')
    expect(prompt).toContain('— Làng Chuông')
    expect(prompt).not.toMatch(/làng\s+Làng/i)
  })

  it('does not duplicate a village prefix that is already part of the location name', () => {
    const prompt = additionalSuggestionPrompt({
      experience_name: 'Tham quan Lò Bầu Cổ & làm gốm',
      village_name: 'Làng gốm Bát Tràng',
      provider_name: '',
    })

    expect(prompt).toContain('— Làng gốm Bát Tràng')
    expect(prompt).not.toMatch(/làng\s+Làng/i)
  })

  it('adds the village prefix when the location name does not already have one', () => {
    const prompt = additionalSuggestionPrompt({
      experience_name: 'Trải nghiệm làm gốm',
      village_name: 'Bát Tràng',
      provider_name: '',
    })

    expect(prompt).toContain('— làng Bát Tràng')
  })

  it('still builds a useful prompt when optional location and provider details are absent', () => {
    const prompt = additionalSuggestionPrompt({ experience_name: '', village_name: '', provider_name: '' })
    expect(prompt).toContain('trải nghiệm được gợi ý này')
    expect(prompt).toContain('giữ nguyên bối cảnh')
  })
})

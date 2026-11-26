import type { RecommendationView } from './matching-view'

type SuggestionDetails = Pick<RecommendationView, 'experience_name' | 'village_name' | 'provider_name'>

export function additionalSuggestionPrompt(suggestion: SuggestionDetails): string {
  const villageName = suggestion.village_name?.trim()
  const village = villageName && (/^làng\b/i.test(villageName) ? villageName : `làng ${villageName}`)
  const identity = [
    suggestion.experience_name,
    village,
    suggestion.provider_name && `xưởng ${suggestion.provider_name}`,
  ].filter(Boolean).join(' — ') || 'trải nghiệm được gợi ý này'

  return `Mình muốn tìm hiểu thêm về "${identity}". Dựa trên các tiêu chí của đoàn trong cuộc trò chuyện hiện tại, hãy giải thích mức độ phù hợp và nêu thông tin cụ thể về hoạt động, thời lượng, sức chứa, chi phí dự kiến cùng những nội dung còn cần xác nhận. Hãy giữ nguyên bối cảnh và tiêu chí hiện tại của cuộc trò chuyện.`
}

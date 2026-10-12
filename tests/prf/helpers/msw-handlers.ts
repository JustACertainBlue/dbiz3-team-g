/**
 * T003 – MSW mock handlers for PRF tests
 * Stubs external third-party service calls:
 * 1. Cloudinary upload API (media upload for profiles and experiences)
 * 2. OpenAI Chat Completions API (AI description refinement draft generation)
 *
 * Constitution IV: No real external network calls in tests; deterministic mocked responses only.
 */

export interface CloudinaryUploadResponse {
  asset_id: string
  public_id: string
  version: number
  version_id: string
  signature: string
  width: number
  height: number
  format: string
  resource_type: string
  created_at: string
  tags: string[]
  bytes: number
  type: string
  etag: string
  placeholder: boolean
  url: string
  secure_url: string
  folder: string
  original_filename: string
}

export interface OpenAIChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: 'assistant'
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/** Mock Cloudinary upload response generator */
export function mockCloudinaryUploadResponse(publicId = 'mock_media_123'): CloudinaryUploadResponse {
  return {
    asset_id: 'mock-asset-001',
    public_id: publicId,
    version: 1,
    version_id: 'mock-version-001',
    signature: 'mock-sig',
    width: 800,
    height: 600,
    format: 'jpg',
    resource_type: 'image',
    created_at: new Date().toISOString(),
    tags: ['craft', 'bat-trang'],
    bytes: 204800,
    type: 'upload',
    etag: 'mock-etag',
    placeholder: false,
    url: `http://res.cloudinary.com/mock-cloud/image/upload/v1/${publicId}.jpg`,
    secure_url: `https://res.cloudinary.com/mock-cloud/image/upload/v1/${publicId}.jpg`,
    folder: 'prf-uploads',
    original_filename: 'sample_craft',
  }
}

/** Mock OpenAI description refinement response generator */
export function mockOpenAICompletionResponse(refinedText: string): OpenAIChatCompletionResponse {
  return {
    id: 'chatcmpl-mock-prf-001',
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'gpt-4o-mini',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: refinedText,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 120,
      completion_tokens: 85,
      total_tokens: 205,
    },
  }
}

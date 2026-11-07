export const mediaUrl = (key: string) => key.startsWith('prf-media/') ? `/api/prf/media/${key.slice(10)}` : key

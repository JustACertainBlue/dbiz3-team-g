// BR-016: the EXP068 gallery lightbox shows the tapped image full-size and browses the same gallery.

export interface LightboxState {
  open: boolean
  index: number
  count: number
}

export function openLightbox(count: number, index: number): LightboxState {
  return { open: count > 0, index: Math.min(Math.max(index, 0), Math.max(count - 1, 0)), count }
}

export function nextImage(state: LightboxState): LightboxState {
  return state.open ? { ...state, index: (state.index + 1) % state.count } : state
}

export function previousImage(state: LightboxState): LightboxState {
  return state.open ? { ...state, index: (state.index - 1 + state.count) % state.count } : state
}

export function closeLightbox(state: LightboxState): LightboxState {
  return { ...state, open: false }
}

import React from 'react'

// spec-EXP FR-010 (#204): "Show refreshed results with a subtle indicator" after F-EXPLORE-10 re-ranks the list.
export default function RefreshedNotice({ show }: { show: boolean }) {
  if (!show) return null
  return <p role="status" className="xv-refreshed" style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
    Đã cập nhật thứ tự kết quả theo các trải nghiệm bạn quan tâm.
  </p>
}

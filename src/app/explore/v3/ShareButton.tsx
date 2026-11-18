'use client'
// "Chia sẻ trải nghiệm" (mockup 04/23): the browser share sheet when available, otherwise copy the page link.
import React, { useState } from 'react'
import { Share2 } from 'lucide-react'

export default function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)
  async function share() {
    const url = window.location.href.split('#')[0]
    try {
      if (navigator.share) { await navigator.share({ title, url }); return }
      await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch { /* cancelled */ }
  }
  return <button type="button" className="v3d-share" aria-label={copied ? 'Đã sao chép liên kết' : 'Chia sẻ trải nghiệm'} title={copied ? 'Đã sao chép liên kết' : 'Chia sẻ trải nghiệm'} onClick={share}><Share2 aria-hidden="true" /></button>
}

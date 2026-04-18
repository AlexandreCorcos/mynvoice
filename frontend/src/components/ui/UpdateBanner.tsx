'use client'

import { RefreshCw } from 'lucide-react'

export default function UpdateBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium text-white"
      style={{ background: 'linear-gradient(135deg, #1a3a4a 0%, #0f2530 100%)' }}
    >
      <RefreshCw size={14} className="shrink-0" />
      <span>A new version is available.</span>
      <button
        onClick={() => window.location.reload()}
        className="underline underline-offset-2 hover:no-underline transition-all"
      >
        Click to update
      </button>
    </div>
  )
}

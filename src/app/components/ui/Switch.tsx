'use client'
// Mockup v3 switch: 46×26, on = --c-primary, role="switch" with a visible text label next to it.
import React from 'react'

export default function Switch({ checked, onChange, label, disabled, id }: { checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean; id?: string }) {
  return <label className="hab-switch">
    <button id={id} type="button" role="switch" aria-checked={checked} disabled={disabled} className="hab-switch__track" onClick={() => onChange(!checked)}>
      <span className="hab-switch__thumb" aria-hidden="true" />
    </button>
    <span className="hab-switch__label">{label}</span>
  </label>
}

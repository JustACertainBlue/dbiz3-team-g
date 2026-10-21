'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentRole, setCurrentRole, getAuthHeaders, type CurrentUserRole } from '@/lib/prf/client-session'
import { IconShield, IconVase, IconSparkles } from '@/app/components/Icons'

export default function AddExperiencePage({
  params,
}: {
  params: { providerId: string }
}) {
  const router = useRouter()
  const [role, setRole] = useState<CurrentUserRole>('LocalProvider')
  const [saving, setSaving] = useState(false)
  const [aiRefining, setAiRefining] = useState(false)
  const [aiDraft, setAiDraft] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: 'Bat Trang Traditional Hand-Wheel Pottery Workshop',
    category: 'Workshop/Hands-on',
    duration_minutes: 90,
    price_per_person: 150000,
    max_participants: 25,
    notice_period_hours: 24,
    experience_location_address: '12 Alley 3, Bat Trang Ancient Craft Village, Gia Lam, Hanoi',
    cancellation_rules_text: 'Cancellation > 24 hours prior: 100% refund. Within 24 hours: 50% cancellation fee.',
    description: 'Guests receive hands-on instruction directly from guild masters from clay kneading to wheel centering, trimming tea bowls, and freehand cobalt brush painting.',
  })

  const [images, setImages] = useState({
    artisan_working: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
    workshop_space: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80',
    finished_product: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80',
  })

  useEffect(() => {
    setRole(getCurrentRole())
    const onRoleChanged = () => {
      setRole(getCurrentRole())
    }
    window.addEventListener('hab_role_changed', onRoleChanged)
    return () => window.removeEventListener('hab_role_changed', onRoleChanged)
  }, [])

  const handleRoleSwitchToProvider = () => {
    setCurrentRole('LocalProvider')
    setRole('LocalProvider')
  }

  const handleAiRefine = () => {
    setAiRefining(true)
    setTimeout(() => {
      setAiDraft(
        `[AI Refine Recommendation]: Immerse in the 700-year pottery legacy of Bat Trang at Hung Thinh Atelier. Learn authentic hand-wheel pulling techniques from 4th-generation guild artisans, craft bespoke Truc Thon clay vessels, and adorn your piece with heirloom lotus motifs. Includes proprietary ash glazing and secure delivery.`
      )
      setAiRefining(false)
    }, 700)
  }

  const handleApplyAiDraft = () => {
    if (aiDraft) {
      setFormData(prev => ({ ...prev, description: aiDraft }))
      setAiDraft(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    if (role !== 'LocalProvider') {
      setError('Permission Error: Only Local Provider accounts are authorized to create experiences (BR-001). Please switch role.')
      setSaving(false)
      return
    }

    const imageList = [
      { url: images.artisan_working, category: 'artisan_working' },
      { url: images.workshop_space, category: 'workshop_space' },
      { url: images.finished_product, category: 'finished_product' },
    ]

    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        duration_minutes: Number(formData.duration_minutes),
        price_per_person: Number(formData.price_per_person),
        max_participants: Number(formData.max_participants),
        notice_period_hours: Number(formData.notice_period_hours),
        experience_location_address: formData.experience_location_address,
        cancellation_policy: {
          rules: [{ threshold_hours: 24, fee_percentage: 50 }],
          notes: formData.cancellation_rules_text,
        },
        images: imageList,
      }

      const res = await fetch('/api/prf/experience', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(params.providerId),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create experience')
      }

      router.push(`/provider/${params.providerId}/experiences`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving')
    } finally {
      setSaving(false)
    }
  }

  const isLocalProvider = role === 'LocalProvider'

  return (
    <div className="prf-container" style={{ paddingBottom: '7rem' }}>
      {/* Header */}
      <div className="prf-spec-header">
        <div>
          <span className="prf-spec-code">SCREEN ID: EXP069 · ADD EXPERIENCE</span>
          <h1 className="prf-spec-title">Create New Craft Village Experience</h1>
          <p className="prf-spec-subtitle">
            Configure B2B wholesale tariffs, cohort limits, workshop duration, and the 3 mandatory image categories (BR-009)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link
            href={`/provider/${params.providerId}/experiences`}
            className="prf-btn prf-btn-outline"
            style={{ fontSize: '0.8rem' }}
          >
            ← Experience Catalog (EXP067)
          </Link>
        </div>
      </div>

      {/* Role Notice */}
      {!isLocalProvider && (
        <div
          style={{
            background: '#fffbeb',
            border: '2px solid #f59e0b',
            borderRadius: '4px',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <strong style={{ color: '#92400e', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconShield size={14} color="#92400e" />
              <span>LOCAL PROVIDER PERMISSION REQUIRED (BR-001)</span>
            </strong>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#78350f' }}>
              You are currently viewing with the role <strong>{role}</strong>. Only Local Provider accounts are authorized to add new experiences.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRoleSwitchToProvider}
            className="prf-btn prf-btn-primary"
            style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <IconVase size={14} color="#ffffff" />
            <span>Switch to Local Provider</span>
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            background: '#fef2f2',
            border: '1px solid #ef4444',
            borderRadius: '4px',
            color: '#991b1b',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.2fr)', gap: '1.75rem' }}>
          {/* Main Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {/* Section 01: Core Information */}
            <div className="prf-section-card">
              <div className="prf-section-heading">
                <span className="prf-step-badge">01</span>
                <div>
                  <h2 style={{ fontSize: '1rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Core Experience Details
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    Title, cultural taxonomy, and session duration
                  </span>
                </div>
              </div>

              <div className="prf-field-group">
                <label className="prf-label">Experience Program Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="prf-input"
                  placeholder="e.g. Traditional Hand-Wheel Pottery Throwing & Glazing"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="prf-field-group">
                  <label className="prf-label">Activity Category *</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="prf-select"
                  >
                    <option value="Workshop/Hands-on">Workshop / Hands-on Pottery</option>
                    <option value="Sightseeing">Heritage Tour / Ancient Kiln</option>
                    <option value="Culinary/Tasting">Village Culinary &amp; Tea Tasting</option>
                    <option value="Combo">Comprehensive All-in-One Experience</option>
                  </select>
                </div>

                <div className="prf-field-group">
                  <label className="prf-label">Duration (Minutes) *</label>
                  <input
                    type="number"
                    required
                    min={15}
                    value={formData.duration_minutes}
                    onChange={e => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                    className="prf-input"
                  />
                </div>
              </div>

              <div className="prf-field-group">
                <label className="prf-label">Experience On-Site Location *</label>
                <input
                  type="text"
                  required
                  value={formData.experience_location_address}
                  onChange={e => setFormData({ ...formData, experience_location_address: e.target.value })}
                  className="prf-input"
                  placeholder="Specific studio address within craft village..."
                />
              </div>
            </div>

            {/* Section 02: Narrative & AI Refine */}
            <div className="prf-section-card">
              <div className="prf-section-heading">
                <span className="prf-step-badge">02</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Detailed Narrative &amp; Description
                    </h2>
                    <button
                      type="button"
                      onClick={handleAiRefine}
                      disabled={aiRefining}
                      className="prf-btn prf-btn-outline"
                      style={{ fontSize: '0.75rem', borderColor: '#b84c24', color: '#b84c24', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <IconSparkles size={12} color="#b84c24" />
                      <span>{aiRefining ? 'AI Refining...' : 'AI Refine Description'}</span>
                    </button>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    Describe artisan mentoring steps, hands-on activities, and guest takeaways
                  </span>
                </div>
              </div>

              <div className="prf-field-group">
                <textarea
                  rows={4}
                  required
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="prf-textarea"
                />
              </div>

              {aiDraft && (
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    background: '#fffbeb',
                    border: '1px solid #fcd34d',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    color: '#78350f',
                    marginTop: '0.75rem',
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>AI Draft Recommendation:</div>
                  <div style={{ lineHeight: 1.5, marginBottom: '0.75rem' }}>{aiDraft}</div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={handleApplyAiDraft}
                      className="prf-btn prf-btn-primary"
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.75rem' }}
                    >
                      Apply This Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiDraft(null)}
                      className="prf-btn prf-btn-outline"
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.75rem' }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Section 03: 3 Mandatory Images (BR-009) */}
            <div className="prf-section-card">
              <div className="prf-section-heading">
                <span className="prf-step-badge">03</span>
                <div>
                  <h2 style={{ fontSize: '1rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    3 Mandatory Photo Categories (BR-009)
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: '#b84c24', fontWeight: 700 }}>
                    Mandatory Standard: All 3 photo categories must be provided to publish
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="prf-field-group">
                  <label className="prf-label">
                    1. Master Artisan at Work (artisan_working) *
                  </label>
                  <input
                    type="url"
                    required
                    value={images.artisan_working}
                    onChange={e => setImages({ ...images, artisan_working: e.target.value })}
                    className="prf-input"
                  />
                </div>

                <div className="prf-field-group">
                  <label className="prf-label">
                    2. Workshop Space &amp; Experience Studio (workshop_space) *
                  </label>
                  <input
                    type="url"
                    required
                    value={images.workshop_space}
                    onChange={e => setImages({ ...images, workshop_space: e.target.value })}
                    className="prf-input"
                  />
                </div>

                <div className="prf-field-group">
                  <label className="prf-label">
                    3. Finished Artifact &amp; Ceramic Piece (finished_product) *
                  </label>
                  <input
                    type="url"
                    required
                    value={images.finished_product}
                    onChange={e => setImages({ ...images, finished_product: e.target.value })}
                    className="prf-input"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Capacity & Logistics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div className="prf-section-card">
              <div className="prf-section-heading">
                <span className="prf-step-badge">04</span>
                <div>
                  <h2 style={{ fontSize: '1rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Tariffs &amp; Cohort Capacity
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    B2B wholesale pricing and group limits
                  </span>
                </div>
              </div>

              <div className="prf-field-group">
                <label className="prf-label">Listed Price / Guest (VND) *</label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={5000}
                  value={formData.price_per_person}
                  onChange={e => setFormData({ ...formData, price_per_person: Number(e.target.value) })}
                  className="prf-input"
                />
              </div>

              <div className="prf-field-group">
                <label className="prf-label">Maximum Guests / Cohort (max_participants) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formData.max_participants}
                  onChange={e => setFormData({ ...formData, max_participants: Number(e.target.value) })}
                  className="prf-input"
                />
              </div>

              <div className="prf-field-group">
                <label className="prf-label">Advance Notice Required (Hours) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={formData.notice_period_hours}
                  onChange={e => setFormData({ ...formData, notice_period_hours: Number(e.target.value) })}
                  className="prf-input"
                />
                <span className="prf-field-helper">Minimum cutoff time for tour agencies to confirm attendee numbers.</span>
              </div>

              <div className="prf-field-group">
                <label className="prf-label">Cancellation Policy Notes</label>
                <textarea
                  rows={3}
                  value={formData.cancellation_rules_text}
                  onChange={e => setFormData({ ...formData, cancellation_rules_text: e.target.value })}
                  className="prf-textarea"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Actions Bar */}
        <div className="prf-sticky-footer">
          <div className="prf-sticky-footer-content">
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              Experience program will take effect immediately upon creation
            </span>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link
                href={`/provider/${params.providerId}/experiences`}
                className="prf-btn prf-btn-outline"
              >
                Discard
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="prf-btn prf-btn-primary"
                style={{ padding: '0.55rem 1.75rem' }}
              >
                {saving ? 'Creating...' : 'Create New Experience (EXP069)'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

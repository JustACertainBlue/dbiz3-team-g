'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentRole, setCurrentRole, getAuthHeaders, type CurrentUserRole } from '@/lib/prf/client-session'
import { IconShield, IconVase, IconLock, IconSparkles } from '@/app/components/Icons'

export default function EditExperiencePage({
  params,
}: {
  params: { providerId: string; experienceId: string }
}) {
  const router = useRouter()
  const [role, setRole] = useState<CurrentUserRole>('LocalProvider')
  const [saving, setSaving] = useState(false)
  const [aiRefining, setAiRefining] = useState(false)
  const [aiDraft, setAiDraft] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Simulation: has active bookings locks price, max_participants, duration (SR-003)
  const [hasActiveBookings] = useState(true)

  const [formData, setFormData] = useState({
    name: 'Traditional Hand-Wheel Pottery Throwing & Glazing',
    category: 'Workshop/Hands-on',
    duration_minutes: 90,
    price_per_person: 150000,
    max_participants: 25,
    notice_period_hours: 24,
    experience_location_address: '12 Alley 3, Bat Trang Ancient Craft Village, Gia Lam, Hanoi',
    cancellation_rules_text: 'Cancellation > 24 hours prior: 100% refund. Same-day cancellation: 50% fee.',
    description: 'Guests receive direct hands-on guidance from guild master artisans from clay wedging and wheel centering to bespoke blue-and-white men lam glaze painting.',
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
        `[AI Refine Recommendation]: Immerse in authentic Bat Trang heritage pottery at Hung Thinh Atelier. Guided closely by master artisan Nguyen Van Hung, each guest experiences the kick-wheel rhythm, shapes bespoke red-river clay vessels, and takes home a collector keepsake.`
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
    setFeedback(null)

    if (role !== 'LocalProvider') {
      setFeedback({
        type: 'error',
        message: 'Permission Error (403): Only Local Provider accounts are authorized to update experiences (BR-001).',
      })
      setSaving(false)
      return
    }

    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        notice_period_hours: Number(formData.notice_period_hours),
        cancellation_policy: {
          rules: [{ threshold_hours: 24, fee_percentage: 50 }],
          notes: formData.cancellation_rules_text,
        },
        images: [
          { url: images.artisan_working, category: 'artisan_working' },
          { url: images.workshop_space, category: 'workshop_space' },
          { url: images.finished_product, category: 'finished_product' },
        ],
      }

      const res = await fetch(`/api/prf/experience/${params.experienceId}`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(params.providerId),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update experience')
      }

      setFeedback({
        type: 'success',
        message: 'Experience updated successfully!',
      })
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error occurred while saving.',
      })
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
          <span className="prf-spec-code">SCREEN ID: EXP070 · EDIT EXPERIENCE</span>
          <h1 className="prf-spec-title">Edit Workshop Cultural Experience</h1>
          <p className="prf-spec-subtitle">
            Update narrative descriptions, photographic portfolio, and guest hosting conditions
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
              You are currently viewing with the role <strong>{role}</strong>. Only Local Provider accounts are authorized to edit workshop experiences.
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

      {/* SR-003 Active Bookings Banner */}
      {hasActiveBookings && (
        <div
          style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '4px',
            padding: '1rem 1.25rem',
            marginBottom: '1.75rem',
            fontSize: '0.82rem',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <IconLock size={20} color="#92400e" />
          <div>
            <strong>LOCKED FIELDS: ACTIVE TOUR BOOKINGS IN EFFECT (SR-003):</strong>
            <p style={{ margin: '0.2rem 0 0 0' }}>
              This experience has active tour contracts or pending reservations. To safeguard tour agency arrangements, <em>Listed Tariff, Maximum Capacity, Duration, and Location</em> are locked from direct modification.
            </p>
          </div>
        </div>
      )}

      {feedback && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            borderRadius: '4px',
            background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: feedback.type === 'success' ? '1px solid #10b981' : '1px solid #ef4444',
            color: feedback.type === 'success' ? '#065f46' : '#991b1b',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.2fr)', gap: '1.75rem' }}>
          {/* Main Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div className="prf-section-card">
              <div className="prf-section-heading">
                <span className="prf-step-badge">01</span>
                <div>
                  <h2 style={{ fontSize: '1rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Activity Name &amp; Classification
                  </h2>
                </div>
              </div>

              <div className="prf-field-group">
                <label className="prf-label">Experience Program Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="prf-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="prf-field-group">
                  <label className="prf-label">Activity Category</label>
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
                  <label className="prf-label">
                    Duration (Minutes)
                    {hasActiveBookings && <span className="prf-badge prf-badge-warning" style={{ marginLeft: '0.5rem' }}>LOCKED</span>}
                  </label>
                  <input
                    type="number"
                    disabled={hasActiveBookings}
                    value={formData.duration_minutes}
                    className="prf-input prf-input-locked"
                  />
                </div>
              </div>
            </div>

            {/* Narrative & AI Refine */}
            <div className="prf-section-card">
              <div className="prf-section-heading">
                <span className="prf-step-badge">02</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Experience Description &amp; Narrative
                    </h2>
                    <button
                      type="button"
                      onClick={handleAiRefine}
                      disabled={aiRefining}
                      className="prf-btn prf-btn-outline"
                      style={{ fontSize: '0.75rem', borderColor: '#b84c24', color: '#b84c24', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <IconSparkles size={12} color="#b84c24" />
                      <span>{aiRefining ? 'Analyzing...' : 'AI Refine Description'}</span>
                    </button>
                  </div>
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
                  <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Standardized AI Recommendation:</div>
                  <div style={{ lineHeight: 1.5, marginBottom: '0.75rem' }}>{aiDraft}</div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={handleApplyAiDraft}
                      className="prf-btn prf-btn-primary"
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.75rem' }}
                    >
                      Apply Recommendation
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

            {/* 3 Images */}
            <div className="prf-section-card">
              <div className="prf-section-heading">
                <span className="prf-step-badge">03</span>
                <div>
                  <h2 style={{ fontSize: '1rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Required Photo Collection (BR-009)
                  </h2>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="prf-field-group">
                  <label className="prf-label">1. Artisan at Work (artisan_working)</label>
                  <input
                    type="url"
                    required
                    value={images.artisan_working}
                    onChange={e => setImages({ ...images, artisan_working: e.target.value })}
                    className="prf-input"
                  />
                </div>
                <div className="prf-field-group">
                  <label className="prf-label">2. Workshop Space (workshop_space)</label>
                  <input
                    type="url"
                    required
                    value={images.workshop_space}
                    onChange={e => setImages({ ...images, workshop_space: e.target.value })}
                    className="prf-input"
                  />
                </div>
                <div className="prf-field-group">
                  <label className="prf-label">3. Finished Product (finished_product)</label>
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

          {/* Right Column: Pricing & Booking conditions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div className="prf-section-card">
              <div className="prf-section-heading">
                <span className="prf-step-badge">04</span>
                <div>
                  <h2 style={{ fontSize: '1rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Pricing &amp; Booking Conditions
                  </h2>
                </div>
              </div>

              <div className="prf-field-group">
                <label className="prf-label">
                  Public Listed Price (VND)
                  {hasActiveBookings && <span className="prf-badge prf-badge-warning" style={{ marginLeft: '0.5rem' }}>LOCKED</span>}
                </label>
                <input
                  type="number"
                  disabled={hasActiveBookings}
                  value={formData.price_per_person}
                  className="prf-input prf-input-locked"
                />
              </div>

              <div className="prf-field-group">
                <label className="prf-label">
                  Maximum Capacity (persons)
                  {hasActiveBookings && <span className="prf-badge prf-badge-warning" style={{ marginLeft: '0.5rem' }}>LOCKED</span>}
                </label>
                <input
                  type="number"
                  disabled={hasActiveBookings}
                  value={formData.max_participants}
                  className="prf-input prf-input-locked"
                />
              </div>

              <div className="prf-field-group">
                <label className="prf-label">Notice Period (Hours)</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={formData.notice_period_hours}
                  onChange={e => setFormData({ ...formData, notice_period_hours: Number(e.target.value) })}
                  className="prf-input"
                />
              </div>

              <div className="prf-field-group">
                <label className="prf-label">Cancellation &amp; Refund Policy</label>
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
              {hasActiveBookings ? 'Pricing is preserved under current active tour contract' : 'All changes take effect immediately'}
            </span>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link
                href={`/provider/${params.providerId}/experiences`}
                className="prf-btn prf-btn-outline"
              >
                Discard Changes
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="prf-btn prf-btn-primary"
                style={{ padding: '0.55rem 1.75rem' }}
              >
                {saving ? 'Saving...' : 'Save Changes (EXP070)'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

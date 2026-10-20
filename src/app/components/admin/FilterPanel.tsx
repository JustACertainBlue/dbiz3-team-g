'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { DashboardFilterParams, TimePreset, VillageOption, FilterAutocompleteOption } from '@/lib/adm/types'
import { getAuthHeaders } from '@/lib/prf/client-session'

interface FilterPanelProps {
  filters: DashboardFilterParams
  onFilterChange: (updated: Partial<DashboardFilterParams>) => void
  villageOptions: VillageOption[]
  isVillageLocked: boolean
  assignedVillageId: string | null
}

const PRESETS: TimePreset[] = [
  'Last 30 days',
  'Last 7 days',
  'Last 90 days',
  'Last year',
  'Custom',
]

interface SwitchDialogState {
  targetCategory: 'Local Provider' | 'Agency'
  targetId: string
  activeCategory: 'Local Provider' | 'Agency'
  activeCount: number
}

export function FilterPanel({
  filters,
  onFilterChange,
  villageOptions,
  isVillageLocked,
  assignedVillageId,
}: FilterPanelProps) {
  const [agencies, setAgencies] = useState<FilterAutocompleteOption[]>([])
  const [providers, setProviders] = useState<FilterAutocompleteOption[]>([])
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [loadingOptions, setLoadingOptions] = useState(false)

  // Combined Filter Popover State
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [isProviderExpanded, setIsProviderExpanded] = useState(false)
  const [isAgencyExpanded, setIsAgencyExpanded] = useState(false)
  const [providerSearch, setProviderSearch] = useState('')
  const [agencySearch, setAgencySearch] = useState('')
  const [switchDialog, setSwitchDialog] = useState<SwitchDialogState | null>(null)

  const popoverRef = useRef<HTMLDivElement>(null)

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true)
    setOptionsError(null)
    try {
      const agencyRes = await fetch('/api/adm/filter-options?type=agency', {
        headers: getAuthHeaders(),
      })
      if (agencyRes.ok) {
        const d = await agencyRes.json()
        setAgencies(d.options || [])
      } else {
        const err = await agencyRes.json().catch(() => ({}))
        setOptionsError(err.error || `Agency options: HTTP ${agencyRes.status}`)
      }

      const provRes = await fetch('/api/adm/filter-options?type=provider', {
        headers: getAuthHeaders(),
      })
      if (provRes.ok) {
        const d = await provRes.json()
        setProviders(d.options || [])
      } else {
        const err = await provRes.json().catch(() => ({}))
        setOptionsError(err.error || `Provider options: HTTP ${provRes.status}`)
      }
    } catch (err: any) {
      setOptionsError(err?.message || 'Network error loading filter options')
    } finally {
      setLoadingOptions(false)
    }
  }, [assignedVillageId])

  useEffect(() => {
    loadOptions()
    window.addEventListener('hab_role_changed', loadOptions)
    return () => window.removeEventListener('hab_role_changed', loadOptions)
  }, [loadOptions])

  // Click outside to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsPopoverOpen(false)
        setSwitchDialog(null)
      }
    }
    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isPopoverOpen])

  // Keyboard accessibility: Escape to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isPopoverOpen) {
        setIsPopoverOpen(false)
        setSwitchDialog(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPopoverOpen])

  const currentPreset = filters.preset || 'Last 30 days'

  // Parse active selected IDs from comma-separated string or array
  const selectedProviderIds = React.useMemo(() => {
    if (filters.providerIds && filters.providerIds.length > 0) return filters.providerIds
    if (!filters.providerId) return []
    return filters.providerId.split(',').map(s => s.trim()).filter(Boolean)
  }, [filters.providerId, filters.providerIds])

  const selectedAgencyIds = React.useMemo(() => {
    if (filters.agencyIds && filters.agencyIds.length > 0) return filters.agencyIds
    if (!filters.agencyId) return []
    return filters.agencyId.split(',').map(s => s.trim()).filter(Boolean)
  }, [filters.agencyId, filters.agencyIds])

  // Mutual exclusion handlers
  const handleToggleProvider = (providerId: string) => {
    // If Agency category currently has selections, require explicit confirmation before switching
    if (selectedAgencyIds.length > 0) {
      setSwitchDialog({
        targetCategory: 'Local Provider',
        targetId: providerId,
        activeCategory: 'Agency',
        activeCount: selectedAgencyIds.length,
      })
      return
    }

    const next = selectedProviderIds.includes(providerId)
      ? selectedProviderIds.filter(id => id !== providerId)
      : [...selectedProviderIds, providerId]

    onFilterChange({
      providerId: next.length > 0 ? next.join(',') : null,
      providerIds: next,
      agencyId: null,
      agencyIds: [],
    })
  }

  const handleToggleAgency = (agencyId: string) => {
    // If Local Provider category currently has selections, require explicit confirmation before switching
    if (selectedProviderIds.length > 0) {
      setSwitchDialog({
        targetCategory: 'Agency',
        targetId: agencyId,
        activeCategory: 'Local Provider',
        activeCount: selectedProviderIds.length,
      })
      return
    }

    const next = selectedAgencyIds.includes(agencyId)
      ? selectedAgencyIds.filter(id => id !== agencyId)
      : [...selectedAgencyIds, agencyId]

    onFilterChange({
      agencyId: next.length > 0 ? next.join(',') : null,
      agencyIds: next,
      providerId: null,
      providerIds: [],
    })
  }

  const handleConfirmSwitch = () => {
    if (!switchDialog) return
    if (switchDialog.targetCategory === 'Local Provider') {
      onFilterChange({
        agencyId: null,
        agencyIds: [],
        providerId: switchDialog.targetId,
        providerIds: [switchDialog.targetId],
      })
    } else {
      onFilterChange({
        providerId: null,
        providerIds: [],
        agencyId: switchDialog.targetId,
        agencyIds: [switchDialog.targetId],
      })
    }
    setSwitchDialog(null)
  }

  const handleClearProviders = () => {
    onFilterChange({ providerId: null, providerIds: [] })
  }

  const handleClearAgencies = () => {
    onFilterChange({ agencyId: null, agencyIds: [] })
  }

  const handleClearCombined = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    onFilterChange({
      providerId: null,
      providerIds: [],
      agencyId: null,
      agencyIds: [],
    })
    setSwitchDialog(null)
  }

  // Combined filter display label
  const getCombinedFilterLabel = () => {
    if (selectedProviderIds.length > 0) {
      if (selectedProviderIds.length === 1) {
        const found = providers.find(p => p.id === selectedProviderIds[0])
        return found ? `Provider: ${found.name}` : `1 Local Provider selected`
      }
      return `${selectedProviderIds.length} Local Providers selected`
    }
    if (selectedAgencyIds.length > 0) {
      if (selectedAgencyIds.length === 1) {
        const found = agencies.find(a => a.id === selectedAgencyIds[0])
        return found ? `Agency: ${found.name}` : `1 Tour Agency selected`
      }
      return `${selectedAgencyIds.length} Tour Agencies selected`
    }
    return 'All (None selected)'
  }

  // Filtered lists for quick search inside accordion
  const filteredProviders = providers.filter(p =>
    p.name.toLowerCase().includes(providerSearch.toLowerCase())
  )
  const filteredAgencies = agencies.filter(a =>
    a.name.toLowerCase().includes(agencySearch.toLowerCase())
  )

  // Format date range text based on active preset or custom range
  const getDateRangeText = () => {
    const now = new Date()
    let pastDays = 30
    if (currentPreset === 'Last 7 days') pastDays = 7
    else if (currentPreset === 'Last 90 days') pastDays = 90
    else if (currentPreset === 'Last year') pastDays = 365

    if (currentPreset === 'Custom' && filters.startDate && filters.endDate) {
      return `${filters.startDate} — ${filters.endDate}`
    }

    const start = new Date(now.getTime() - pastDays * 24 * 60 * 60 * 1000)
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${now.toLocaleDateString('en-US', options)}`
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '20px',
      }}
    >
      {/* Top Controls Row: Header and Time Period */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Left Header Title matching ADM079.png */}
        <div>
          <div
            style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              color: '#71717a',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontFamily: 'monospace, sans-serif',
            }}
          >
            ADMINISTRATION
          </div>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: '#09090b',
              margin: '2px 0 0 0',
              letterSpacing: '-0.02em',
            }}
          >
            Dashboard
          </h1>
        </div>

        {/* Right Time Period Dropdown matching ADM079.png */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div
            style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              color: '#71717a',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontFamily: 'monospace, sans-serif',
              marginBottom: '6px',
            }}
          >
            TIME PERIOD
          </div>

          <div style={{ position: 'relative' }}>
            <select
              value={currentPreset}
              onChange={e => onFilterChange({ preset: e.target.value as TimePreset })}
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                background: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '8px',
                padding: '8px 36px 8px 14px',
                fontSize: '0.85rem',
                fontWeight: 500,
                color: '#09090b',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              {PRESETS.map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {/* Down chevron icon */}
            <span
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: '#71717a',
                fontSize: '0.75rem',
              }}
            >
              ▼
            </span>
          </div>

          {/* Subtitle Date Range display e.g. Aug 22 - Sep 20, 2026 */}
          <div
            style={{
              fontSize: '0.72rem',
              color: '#71717a',
              fontFamily: 'monospace, sans-serif',
              marginTop: '4px',
            }}
          >
            {getDateRangeText()}
          </div>
        </div>
      </div>

      {/* Custom Date Picker Inputs when Custom is selected */}
      {currentPreset === 'Custom' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: '#ffffff',
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #e4e4e7',
            width: 'fit-content',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
            <label style={{ color: '#71717a', fontWeight: 500 }}>From:</label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={e => onFilterChange({ startDate: e.target.value })}
              style={{ border: '1px solid #e4e4e7', borderRadius: '4px', padding: '4px 8px', fontSize: '0.8rem' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
            <label style={{ color: '#71717a', fontWeight: 500 }}>To:</label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={e => onFilterChange({ endDate: e.target.value })}
              style={{ border: '1px solid #e4e4e7', borderRadius: '4px', padding: '4px 8px', fontSize: '0.8rem' }}
            />
          </div>
        </div>
      )}

      {/* Options Error Banner if option fetch fails */}
      {optionsError && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '8px 14px',
            borderRadius: '6px',
            fontSize: '0.78rem',
          }}
        >
          ⚠️ Error loading filter options: {optionsError}
        </div>
      )}

      {/* Scope and Entity Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          background: '#ffffff',
          padding: '10px 16px',
          borderRadius: '10px',
          border: '1px solid #e4e4e7',
          position: 'relative',
        }}
      >
        {/* Village Scope Selector (HDT selectable, UBND locked per BR-003) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '220px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#71717a', letterSpacing: '0.04em' }}>
            VILLAGE:
          </span>
          {isVillageLocked ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#f4f4f5',
                border: '1px solid #e4e4e7',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#09090b',
              }}
              title="Assigned administrative village is locked for UBND"
            >
              <span>🔒</span>
              <span>
                {villageOptions.find(v => v.villageId === assignedVillageId)?.name || 'Assigned Village'}
              </span>
            </div>
          ) : (
            <select
              value={filters.villageId || ''}
              onChange={e => onFilterChange({ villageId: e.target.value || null })}
              style={{
                background: '#fcfcfd',
                border: '1px solid #e4e4e7',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '0.8rem',
                color: '#09090b',
                cursor: 'pointer',
              }}
            >
              <option value="">All Craft Villages (Platform-Wide)</option>
              {villageOptions.map(v => (
                <option key={v.villageId} value={v.villageId}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* PART 2: Combined Filter Box: Local Provider / Agency */}
        <div ref={popoverRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#71717a', letterSpacing: '0.04em' }}>
            LOCAL PROVIDER / AGENCY:
          </span>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              border: '1px solid #e4e4e7',
              borderRadius: '6px',
              background: '#fcfcfd',
              padding: '2px',
            }}
          >
            <button
              type="button"
              id="combined-filter-trigger"
              onClick={() => setIsPopoverOpen(prev => !prev)}
              aria-haspopup="dialog"
              aria-expanded={isPopoverOpen}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px 10px',
                fontSize: '0.8rem',
                fontWeight: (selectedProviderIds.length > 0 || selectedAgencyIds.length > 0) ? 600 : 400,
                color: (selectedProviderIds.length > 0 || selectedAgencyIds.length > 0) ? '#09090b' : '#52525b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                outline: 'none',
              }}
            >
              <span>{getCombinedFilterLabel()}</span>
              <span style={{ fontSize: '0.68rem', color: '#71717a' }}>{isPopoverOpen ? '▲' : '▼'}</span>
            </button>

            {/* Clear button if any entity is selected */}
            {(selectedProviderIds.length > 0 || selectedAgencyIds.length > 0) && (
              <button
                type="button"
                onClick={handleClearCombined}
                title="Clear selections"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#a1a1aa',
                  padding: '2px 6px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  borderRadius: '4px',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Dropdown / Popover Container */}
          {isPopoverOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                zIndex: 60,
                background: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '10px',
                padding: '16px',
                width: '420px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* Popover Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#09090b' }}>
                    Select Provider or Agency
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#71717a' }}>
                    Mutually exclusive: select multiple within one category.
                  </p>
                </div>

                {(selectedProviderIds.length > 0 || selectedAgencyIds.length > 0) && (
                  <button
                    type="button"
                    onClick={handleClearCombined}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '2px 6px',
                    }}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Mutual Exclusion Switch Confirmation Warning */}
              {switchDialog && (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <span style={{ fontSize: '0.9rem' }}>⚠️</span>
                    <span style={{ fontSize: '0.75rem', color: '#92400e', lineHeight: 1.4 }}>
                      <strong>Mutually Exclusive Selection:</strong> You currently have {switchDialog.activeCount} {switchDialog.activeCategory} selected. You cannot select {switchDialog.targetCategory} simultaneously.
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setSwitchDialog(null)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        color: '#374151',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmSwitch}
                      style={{
                        background: '#b45309',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '3px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Clear & Switch
                    </button>
                  </div>
                </div>
              )}

              {/* Category 1: Local Provider Accordion Row */}
              <div
                style={{
                  border: '1px solid #e4e4e7',
                  borderRadius: '8px',
                  background: selectedProviderIds.length > 0 ? '#f0fdf4' : '#fafafa',
                  overflow: 'hidden',
                }}
              >
                {/* Accordion Row Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#09090b' }}>
                      Local Provider
                    </span>
                    {selectedProviderIds.length > 0 && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          background: '#dcfce7',
                          color: '#15803d',
                          padding: '1px 6px',
                          borderRadius: '10px',
                        }}
                      >
                        {selectedProviderIds.length} active
                      </span>
                    )}
                  </div>

                  {/* Accessible Plus / Minus Expansion Control */}
                  <button
                    type="button"
                    aria-expanded={isProviderExpanded}
                    aria-label="Toggle Local Provider category"
                    onClick={() => setIsProviderExpanded(prev => !prev)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e4e4e7',
                      borderRadius: '4px',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#09090b',
                      cursor: 'pointer',
                    }}
                  >
                    {isProviderExpanded ? '−' : '+'}
                  </button>
                </div>

                {/* Expanded Local Provider Checkbox List */}
                {isProviderExpanded && (
                  <div
                    style={{
                      borderTop: '1px solid #e4e4e7',
                      background: '#ffffff',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}
                  >
                    {/* Search and Clear Sub-bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Search providers..."
                        value={providerSearch}
                        onChange={e => setProviderSearch(e.target.value)}
                        style={{
                          flex: 1,
                          fontSize: '0.75rem',
                          padding: '4px 8px',
                          border: '1px solid #e4e4e7',
                          borderRadius: '4px',
                        }}
                      />
                      {selectedProviderIds.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearProviders}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#71717a',
                            fontSize: '0.7rem',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Providers List */}
                    {loadingOptions ? (
                      <div style={{ fontSize: '0.75rem', color: '#71717a', padding: '6px 0' }}>
                        Loading providers...
                      </div>
                    ) : filteredProviders.length === 0 ? (
                      <div style={{ fontSize: '0.75rem', color: '#71717a', padding: '6px 0' }}>
                        No local providers available in current scope.
                      </div>
                    ) : (
                      filteredProviders.map(p => {
                        const isChecked = selectedProviderIds.includes(p.id)
                        return (
                          <label
                            key={p.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '0.78rem',
                              color: '#09090b',
                              cursor: 'pointer',
                              padding: '3px 0',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleProvider(p.id)}
                              style={{ cursor: 'pointer' }}
                            />
                            <span>{p.name}</span>
                          </label>
                        )
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Category 2: Tour Agency Accordion Row */}
              <div
                style={{
                  border: '1px solid #e4e4e7',
                  borderRadius: '8px',
                  background: selectedAgencyIds.length > 0 ? '#f0fdf4' : '#fafafa',
                  overflow: 'hidden',
                }}
              >
                {/* Accordion Row Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#09090b' }}>
                      Agency
                    </span>
                    {selectedAgencyIds.length > 0 && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          background: '#dcfce7',
                          color: '#15803d',
                          padding: '1px 6px',
                          borderRadius: '10px',
                        }}
                      >
                        {selectedAgencyIds.length} active
                      </span>
                    )}
                  </div>

                  {/* Accessible Plus / Minus Expansion Control */}
                  <button
                    type="button"
                    aria-expanded={isAgencyExpanded}
                    aria-label="Toggle Agency category"
                    onClick={() => setIsAgencyExpanded(prev => !prev)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e4e4e7',
                      borderRadius: '4px',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#09090b',
                      cursor: 'pointer',
                    }}
                  >
                    {isAgencyExpanded ? '−' : '+'}
                  </button>
                </div>

                {/* Expanded Agency Checkbox List */}
                {isAgencyExpanded && (
                  <div
                    style={{
                      borderTop: '1px solid #e4e4e7',
                      background: '#ffffff',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}
                  >
                    {/* Search and Clear Sub-bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Search agencies..."
                        value={agencySearch}
                        onChange={e => setAgencySearch(e.target.value)}
                        style={{
                          flex: 1,
                          fontSize: '0.75rem',
                          padding: '4px 8px',
                          border: '1px solid #e4e4e7',
                          borderRadius: '4px',
                        }}
                      />
                      {selectedAgencyIds.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAgencies}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#71717a',
                            fontSize: '0.7rem',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Agencies List */}
                    {loadingOptions ? (
                      <div style={{ fontSize: '0.75rem', color: '#71717a', padding: '6px 0' }}>
                        Loading agencies...
                      </div>
                    ) : filteredAgencies.length === 0 ? (
                      <div style={{ fontSize: '0.75rem', color: '#71717a', padding: '6px 0' }}>
                        No tour agencies available in current scope.
                      </div>
                    ) : (
                      filteredAgencies.map(a => {
                        const isChecked = selectedAgencyIds.includes(a.id)
                        return (
                          <label
                            key={a.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '0.78rem',
                              color: '#09090b',
                              cursor: 'pointer',
                              padding: '3px 0',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleAgency(a.id)}
                              style={{ cursor: 'pointer' }}
                            />
                            <span>{a.name}</span>
                          </label>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reset Filters action */}
        {(selectedAgencyIds.length > 0 || selectedProviderIds.length > 0 || (filters.villageId && !isVillageLocked)) && (
          <button
            type="button"
            onClick={() => {
              onFilterChange({
                agencyId: null,
                agencyIds: [],
                providerId: null,
                providerIds: [],
                villageId: isVillageLocked ? assignedVillageId : null,
              })
              setSwitchDialog(null)
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#71717a',
              fontSize: '0.75rem',
              textDecoration: 'underline',
              cursor: 'pointer',
              marginLeft: 'auto',
            }}
          >
            Reset Filters
          </button>
        )}
      </div>
    </div>
  )
}

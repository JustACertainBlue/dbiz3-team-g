'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { DashboardFilterParams, TimePreset, VillageOption, FilterAutocompleteOption } from '@/lib/adm/types'
import { getAuthHeaders } from '@/lib/prf/client-session'
import { ChevronDown, Lock } from 'lucide-react'
import { hanoiDate } from '@/lib/time/hanoi-time'

interface FilterPanelProps {
  filters: DashboardFilterParams
  onFilterChange: (updated: Partial<DashboardFilterParams>) => void
  villageOptions: VillageOption[]
  isVillageLocked: boolean
  assignedVillageId: string | null
  /** ADM079 #1 screen title (scope-aware); design wave 4. */
  title?: string
  /** Actions rendered in the title row (e.g. Manage accounts link). */
  actions?: React.ReactNode
  /** ADM079 #17 Apply filters button: callback and disabled state, rendered inside the filter box. */
  onApply?: () => void
  applyDisabled?: boolean
}

const PRESETS: TimePreset[] = [
  'Last 30 days',
  'Last 7 days',
  'Last 90 days',
  'Last year',
  'Custom',
]

// Design wave 4 (Figma "Màn 5"): Vietnamese display labels; the stored enum values stay in English.
const PRESET_LABEL: Record<TimePreset, string> = {
  'Last 7 days': '7 ngày gần nhất',
  'Last 30 days': '30 ngày gần nhất',
  'Last 90 days': '90 ngày gần nhất',
  'Last year': '1 năm gần nhất',
  Custom: 'Tuỳ chọn',
}
const dmy = (date: string) => date ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : ''

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
  title,
  actions,
  onApply,
  applyDisabled,
}: FilterPanelProps) {
  const [agencies, setAgencies] = useState<FilterAutocompleteOption[]>([])
  const [providers, setProviders] = useState<FilterAutocompleteOption[]>([])
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [loadingOptions, setLoadingOptions] = useState(false)

  // Combined Filter Popover State
  const [openBox, setOpenBox] = useState<'Agency' | 'Provider' | null>(null)
  const isPopoverOpen = openBox !== null
  const setIsPopoverOpen = (open: boolean) => { if (!open) setOpenBox(null) }
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

  // Date range under the period, Hanoi dates (same window as before: today minus the preset length).
  const getDateRangeText = () => {
    if (currentPreset === 'Custom') return filters.startDate && filters.endDate ? `${dmy(filters.startDate)} – ${dmy(filters.endDate)}` : 'Chọn ngày bắt đầu và kết thúc'
    const now = new Date()
    const pastDays = currentPreset === 'Last 7 days' ? 7 : currentPreset === 'Last 90 days' ? 90 : currentPreset === 'Last year' ? 365 : 30
    const start = new Date(now.getTime() - pastDays * 24 * 60 * 60 * 1000)
    return `${dmy(hanoiDate(start))} – ${dmy(hanoiDate(now))}`
  }

  const selectionText = (kind: 'Agency' | 'Provider', ids: string[], options: FilterAutocompleteOption[]) => {
    if (ids.length === 0) return 'Tất cả'
    if (ids.length === 1) return options.find(option => option.id === ids[0])?.name || `1 ${kind} đã chọn`
    return `${ids.length} ${kind} đã chọn`
  }

  // Agency and Provider boxes keep the existing rule: one category at a time, switching asks first.
  const entityBox = (kind: 'Agency' | 'Provider') => {
    const isAgency = kind === 'Agency'
    const ids = isAgency ? selectedAgencyIds : selectedProviderIds
    const options = isAgency ? agencies : providers
    const filtered = isAgency ? filteredAgencies : filteredProviders
    const search = isAgency ? agencySearch : providerSearch
    const setSearch = isAgency ? setAgencySearch : setProviderSearch
    const toggle = isAgency ? handleToggleAgency : handleToggleProvider
    const clear = isAgency ? handleClearAgencies : handleClearProviders
    const open = openBox === kind
    const dialogHere = switchDialog && (switchDialog.targetCategory === 'Agency') === isAgency
    const otherLabel = (category: string) => category === 'Agency' ? 'Agency' : 'Provider'
    return (
      <div className="ad9-field">
        <span className="ad9-field__label" id={`ad9-${kind}-label`}>{kind}</span>
        <div className="ad9-picker">
          <button type="button" className={`ad9-input ad9-input--button combined-filter-trigger${ids.length ? ' is-set' : ''}`} aria-haspopup="listbox" aria-expanded={open} aria-labelledby={`ad9-${kind}-label ad9-${kind}-value`}
            onClick={() => { setOpenBox(open ? null : kind); setSwitchDialog(null) }}>
            <span id={`ad9-${kind}-value`}>{selectionText(kind, ids, options)}</span>
            <ChevronDown size={18} aria-hidden="true" />
          </button>
          {ids.length > 0 && <button type="button" className="ad9-clear" aria-label={`Bỏ chọn ${kind}`} onClick={clear}>✕</button>}
        </div>
        {open && (
          <div className="ad9-pop" role="dialog" aria-label={`Chọn ${kind}`}>
            {dialogHere && switchDialog && (
              <div className="ad9-switch" role="alertdialog" aria-label="Đổi nhóm bộ lọc">
                <p>Mỗi lần chỉ lọc theo một nhóm. Đang chọn {switchDialog.activeCount} {otherLabel(switchDialog.activeCategory)}; chọn {kind} sẽ bỏ các lựa chọn đó.</p>
                <div>
                  <button type="button" className="ad9-btn ad9-btn--small" onClick={() => setSwitchDialog(null)}>Giữ lựa chọn</button>
                  <button type="button" className="ad9-btn ad9-btn--small ad9-btn--primary" onClick={handleConfirmSwitch}>Chuyển sang {kind}</button>
                </div>
              </div>
            )}
            <input type="search" className="ad9-input ad9-input--search" placeholder={`Tìm ${kind}…`} aria-label={`Tìm ${kind}`} value={search} onChange={event => setSearch(event.target.value)} />
            {loadingOptions ? <p className="ad9-pop__note">Đang tải…</p>
              : filtered.length === 0 ? <p className="ad9-pop__note">Không có kết quả</p>
              : <ul role="listbox" aria-multiselectable="true" aria-label={kind}>{filtered.map(option => (
                <li key={option.id}><label><input type="checkbox" checked={ids.includes(option.id)} onChange={() => toggle(option.id)} /> {option.name}</label></li>
              ))}</ul>}
          </div>
        )}
      </div>
    )
  }

  const hasReset = selectedAgencyIds.length > 0 || selectedProviderIds.length > 0 || Boolean(filters.villageId && !isVillageLocked)
  const lockedName = villageOptions.find(v => v.villageId === assignedVillageId)?.name || 'Làng được giao'

  return (
    <div className="ad9-filterbar">
      {/* Screen title (ADM079 #1) and the actions (#17 Apply filters, #18 Manage accounts) */}
      <div className="ad9-title">
        <h1>{title ?? 'Dashboard'}</h1>
        {actions}
      </div>

      {/* Filters #2–#9: Thời gian · Làng · Agency · Provider (Figma "Màn 5") */}
      <div className="ad9-filters ad9-glass" ref={popoverRef}>
        <div className="ad9-field">
          <label className="ad9-field__label" htmlFor="ad9-period">Thời gian</label>
          <span className="ad9-select">
            <select id="ad9-period" className="ad9-input" value={currentPreset} onChange={e => onFilterChange({ preset: e.target.value as TimePreset })}>
              {PRESETS.map(preset => <option key={preset} value={preset}>{PRESET_LABEL[preset]}</option>)}
            </select>
            <ChevronDown size={18} aria-hidden="true" />
          </span>
          <span className="ad9-field__hint">{getDateRangeText()}</span>
          {currentPreset === 'Custom' && (
            <div className="ad9-dates">
              <label>Từ ngày<input type="date" className="ad9-input" value={filters.startDate || ''} onChange={e => onFilterChange({ startDate: e.target.value })} /></label>
              <label>Đến ngày<input type="date" className="ad9-input" value={filters.endDate || ''} onChange={e => onFilterChange({ endDate: e.target.value })} /></label>
            </div>
          )}
        </div>

        <div className="ad9-field">
          <label className="ad9-field__label" htmlFor="ad9-village">Làng</label>
          {isVillageLocked ? (
            <>
              <span id="ad9-village" className="ad9-input ad9-input--locked" aria-describedby="ad9-village-hint">
                <span>{lockedName}</span><Lock size={18} aria-hidden="true" />
              </span>
              <span className="ad9-field__hint" id="ad9-village-hint">Bị khoá theo tài khoản UBND</span>
            </>
          ) : (
            <span className="ad9-select">
              <select id="ad9-village" className="ad9-input" value={filters.villageId || ''} onChange={e => onFilterChange({ villageId: e.target.value || null })}>
                <option value="">Tất cả các làng</option>
                {villageOptions.map(v => <option key={v.villageId} value={v.villageId}>{v.name}</option>)}
              </select>
              <ChevronDown size={18} aria-hidden="true" />
            </span>
          )}
        </div>

        {entityBox('Agency')}
        {entityBox('Provider')}
        {onApply && (
          <div className="ad9-field ad9-field--apply">
            <button
              type="button"
              className="ad9-btn ad9-btn--primary"
              disabled={applyDisabled}
              onClick={onApply}
            >
              Áp dụng bộ lọc
            </button>
          </div>
        )}
      </div>

      {optionsError && <p className="ad9-alert" role="alert">Không tải được danh sách bộ lọc: {optionsError}</p>}
      {hasReset && (
        <button
          type="button"
          className="ad9-reset"
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
        >
          Xoá bộ lọc
        </button>
      )}
    </div>
  )
}

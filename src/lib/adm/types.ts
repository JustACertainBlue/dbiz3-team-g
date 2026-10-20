/**
 * Admin Dashboard (ADM) Core Slice TypeScript Definitions
 * Aligned with spec.md §5.1, contracts/admin-dashboard-api.md, and data/schema.sql
 */

export type AdminRole = 'ADMIN'
export type AdminType = 'HDT' | 'UBND'
export type TimePreset = 'Last 7 days' | 'Last 30 days' | 'Last 90 days' | 'Last year' | 'Custom'
export type TrendGranularity = 'Daily' | 'Weekly' | 'Monthly'
export type TrendDirection = 'Up' | 'Down' | 'Flat' | null

export type AgencyAccountStatus = 'Pending Approval' | 'Approved' | 'Rejected' | 'Disabled'
export type ProviderAccountStatus = 'Active' | 'Disabled'
export type ProviderVerificationStatus = 'Draft' | 'Pending Verification' | 'Verified' | 'Revision Required'
export type BookingStatus = 'On hold' | 'Booked' | 'Completed' | 'Cancelled'
export type CollaborationSortBy = 'Frequency' | 'Recency'

export interface AdminScope {
  role: string
  adminType: AdminType
  assignedVillageId: string | null
  effectiveVillageId: string | null
  isVillageFilterLocked: boolean
}

export interface MetricCard {
  label: 'Total Agencies' | 'Total Providers' | 'Total Bookings' | 'Active Collaborations'
  value: number
  trendPct: number | null
  trendDirection: TrendDirection
  subLabel: string
}

export interface AgencyActivityItem {
  activityType: 'Quote Request' | 'Chat' | 'Booking'
  count: number
}

export interface AgencyStatusItem {
  status: AgencyAccountStatus
  count: number
  pct: number
}

export interface AgencyMetrics {
  countsByStatus: Record<AgencyAccountStatus, number>
  activeAgencyCount: number
  activityDistribution?: AgencyActivityItem[]
  statusChartData: AgencyStatusItem[]
}

export interface ProviderVillageCount {
  villageId: string
  villageName: string
  accountStatus: Record<ProviderAccountStatus, number>
  verificationStatus: Record<ProviderVerificationStatus, number>
}

export interface ProviderActivityItem {
  craftType: string
  activityType: 'Quote Request' | 'Chat' | 'Booking'
  count: number
}

export interface ProviderMetrics {
  countsByVillageAndStatus: ProviderVillageCount[]
  activeProviderCount: number
  bookingCount: number
  activityDistribution: ProviderActivityItem[]
}

export interface BookingRecord {
  bookingId: string
  date: string // start_at ISO timestamp
  agencyName: string
  providerName: string
  experienceName: string
  status: BookingStatus
  price: number
}

export interface BookingStatusItem {
  status: BookingStatus
  count: number
  pct: number
}

export interface BookingTrendItem {
  periodStart: string
  count: number
}

export interface BookingMetrics {
  countsByStatus: Record<BookingStatus, number>
  statusChartData: BookingStatusItem[]
  trendChartData: BookingTrendItem[]
  bookingTable: BookingRecord[]
}

export interface CollaborationPair {
  agencyId: string
  agencyName: string
  providerId: string
  providerName: string
  bookingCount: number
  lastDate: string
}

export interface CollaborationMetrics {
  topPairs: CollaborationPair[]
  sortBy: CollaborationSortBy
  visualizationType: 'Ranked List'
}

export interface DashboardMetricsResponse {
  scope: AdminScope
  period: {
    preset: TimePreset
    startDate: string
    endDate: string
    granularity: TrendGranularity
  }
  metricCards: MetricCard[]
  agencyMetrics: AgencyMetrics
  providerMetrics: ProviderMetrics
  bookingMetrics: BookingMetrics
  collaborationMetrics: CollaborationMetrics
}

export interface VillageOption {
  villageId: string
  name: string
  district: string
}

export interface VillagesResponse {
  isLocked: boolean
  assignedVillageId: string | null
  villages: VillageOption[]
}

export interface FilterAutocompleteOption {
  id: string
  name: string
  villageId?: string
}

export interface FilterOptionsResponse {
  type: 'agency' | 'provider'
  options: FilterAutocompleteOption[]
}

export interface DashboardFilterParams {
  preset?: TimePreset
  startDate?: string
  endDate?: string
  villageId?: string | null
  agencyId?: string | null
  providerId?: string | null
  agencyIds?: string[]
  providerIds?: string[]
  sortBy?: CollaborationSortBy
}

export interface UserAccountItem {
  userId: string
  name: string
  email: string
  role: 'ADMIN' | 'Tour_Agency' | 'Local_Provider'
  adminType?: 'HDT' | 'UBND'
  organization: string
  status: 'Active' | 'Approved' | 'Disabled' | 'Pending Approval' | 'Rejected'
  lastLogin: string | null
  createdDate: string
  villageId?: string | null
  villageName?: string | null
  phone?: string
  title?: string
  enabled: boolean
}

export interface PendingVerificationAccount {
  id: string
  name: string
  email: string
  role: 'PROVIDER' | 'AGENCY'
  organization: string
  submissionDate: string
  villageId?: string | null
  initials: string
}

export interface UserManagementResponse {
  users: UserAccountItem[]
  pendingUsers: PendingVerificationAccount[]
  totalCount: number
  scope: AdminScope
}

export interface CreateAccountPayload {
  name: string
  email: string
  organization?: string
  phone: string
  role: 'ADMIN' | 'Local_Provider'
  adminType?: 'UBND'
  assignedVillageId?: string
  address?: string
  permissions?: string[]
}

export interface CreateAccountResult {
  success: boolean
  userId?: string
  accountStatus?: 'Active'
  mustChangePassword?: boolean
  credentialEmailStatus?: 'Success' | 'Fail'
  villageAssignment?: {
    ubndUserId: string
    villageId: string
  }
  providerProfileId?: string
  profileVerificationStatus?: 'Draft'
  successNotification?: string
  account?: UserAccountItem
  error?: string
}


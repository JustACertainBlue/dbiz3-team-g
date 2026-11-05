// BKG navigation targets shared by the Provider and Agency pages (spec-BKG #66, #68, #69).

/** Local Provider: Dashboard → DSH018, Bookings → BKG133, Schedule → SCH139. */
export function providerBkgLinks(providerId: string) {
  return {
    dashboard: `/provider/${providerId}/dashboard`,
    bookings: `/provider/${providerId}/bookings`,
    schedule: `/provider/${providerId}/schedule`,
  }
}

/** Tour Agency: Bookings → BKG137 Booking History, Schedule → SCH141 Agency Schedule. */
export function agencyBkgLinks(agencyId: string) {
  return {
    bookings: `/agency/${agencyId}/bookings`,
    schedule: `/agency/${agencyId}/schedule`,
  }
}

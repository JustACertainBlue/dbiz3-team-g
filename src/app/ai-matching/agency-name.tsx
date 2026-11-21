'use client'
// What the server layout knows about the signed-in account: the contact name for the greeting, the role and the Agency id.
// layout.tsx (server) passes plain strings; this is a real client component (a function), not the raw Context.Provider
// object: a Provider exported from a 'use client' file cannot be rendered by a server component (React: "Element type is invalid").
import React, { createContext, useContext } from 'react'

export interface AgencySession { name: string; role: 'Agency' | 'Guest'; agencyId: string }

const AgencySessionContext = createContext<AgencySession>({ name: '', role: 'Guest', agencyId: '' })

export function AgencyNameProvider({ name, role = 'Agency', agencyId = '', children }: { name: string; role?: 'Agency' | 'Guest'; agencyId?: string; children: React.ReactNode }) {
  return <AgencySessionContext.Provider value={{ name, role, agencyId }}>{children}</AgencySessionContext.Provider>
}

export const useAgencyName = () => useContext(AgencySessionContext).name
export const useAgencySession = () => useContext(AgencySessionContext)

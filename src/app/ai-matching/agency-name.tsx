'use client'
// The contact name of the signed-in Agency for the greeting of the new-conversation state. layout.tsx (server) passes
// only a string `name`; this is a real client component (a function), not the raw Context.Provider object: a
// Provider exported from a 'use client' file cannot be rendered by a server component (React: "Element type is invalid").
import React, { createContext, useContext } from 'react'

const AgencyNameContext = createContext('')

export function AgencyNameProvider({ name, children }: { name: string; children: React.ReactNode }) {
  return <AgencyNameContext.Provider value={name}>{children}</AgencyNameContext.Provider>
}

export const useAgencyName = () => useContext(AgencyNameContext)

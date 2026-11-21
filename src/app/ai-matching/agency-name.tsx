'use client'
// The contact name of the signed-in Agency, read on the server by layout.tsx, for the greeting of the new-conversation state.
import { createContext, useContext } from 'react'

const AgencyNameContext = createContext('')
export const AgencyNameProvider = AgencyNameContext.Provider
export const useAgencyName = () => useContext(AgencyNameContext)

'use client'

import { createContext, useContext } from 'react'

export interface ActiveShift {
  id:             string
  inicio:         string
  sucursal_id:    string | null
  sucursal_code:  string | null
  sucursal_name:  string | null
}

export const ShiftContext = createContext<ActiveShift | null>(null)

export function useShift() {
  return useContext(ShiftContext)
}

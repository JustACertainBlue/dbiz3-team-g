/**
 * T004: Canonical seed data package verification
 * Loads data/seed/ CSV files directly and validates baseline Session 5 data package values:
 * - 8 craft villages in villages.csv
 * - 8 bookings in bookings.csv
 * - Canonical booking statuses: 'On hold', 'Booked', 'Completed', 'Cancelled' (BR-007)
 * - Specific fixture totals from Session 5 seed package
 */

import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function parseCsv(content: string): Array<Record<string, string>> {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0)
  if (lines.length === 0) return []

  const parseRow = (row: string): string[] => {
    const entries: string[] = []
    let current = ''
    let insideQuote = false

    for (let i = 0; i < row.length; i++) {
      const char = row[i]
      if (char === '"') {
        if (insideQuote && row[i + 1] === '"') {
          current += '"'
          i++
        } else {
          insideQuote = !insideQuote
        }
      } else if (char === ',' && !insideQuote) {
        entries.push(current)
        current = ''
      } else {
        current += char
      }
    }
    entries.push(current)
    return entries
  }

  const headers = parseRow(lines[0])
  const results: Array<Record<string, string>> = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] !== undefined ? values[index].trim() : ''
    })
    results.push(row)
  }

  return results
}

describe('T004: Canonical Seed Data Package Verification', () => {
  const seedDir = path.join(process.cwd(), 'data', 'seed')

  describe('Craft Villages (villages.csv)', () => {
    it('loads exactly 8 craft villages from data/seed/villages.csv', () => {
      const csvPath = path.join(seedDir, 'villages.csv')
      expect(fs.existsSync(csvPath)).toBe(true)

      const csvContent = fs.readFileSync(csvPath, 'utf-8')
      const rows = parseCsv(csvContent)
      expect(rows).toHaveLength(8)
    })

    it('contains Bát Tràng, Vạn Phúc, and Chuông villages with valid UUIDs', () => {
      const csvContent = fs.readFileSync(path.join(seedDir, 'villages.csv'), 'utf-8')
      const rows = parseCsv(csvContent)

      const batTrang = rows.find(r => r.name === 'Bát Tràng')
      expect(batTrang).toBeDefined()
      expect(batTrang?.village_id).toBe('20896522-6235-5699-aeaf-f48b8150d895')
      expect(batTrang?.district).toBe('Gia Lâm')
      expect(batTrang?.is_active).toBe('true')

      const vanPhuc = rows.find(r => r.name === 'Vạn Phúc')
      expect(vanPhuc).toBeDefined()
      expect(vanPhuc?.village_id).toBe('c0d0d95f-d59c-5c35-946a-f397e380dd14')
      expect(vanPhuc?.is_active).toBe('true')

      const chuong = rows.find(r => r.name === 'Chuông')
      expect(chuong).toBeDefined()
      expect(chuong?.village_id).toBe('688d408b-9d98-5b66-bfa7-659a67462108')
      expect(chuong?.is_active).toBe('true')
    })
  })

  describe('Bookings & Canonical Statuses (bookings.csv - BR-007)', () => {
    it('loads exactly 8 bookings from data/seed/bookings.csv', () => {
      const csvPath = path.join(seedDir, 'bookings.csv')
      expect(fs.existsSync(csvPath)).toBe(true)

      const csvContent = fs.readFileSync(csvPath, 'utf-8')
      const rows = parseCsv(csvContent)
      expect(rows).toHaveLength(8)
    })

    it('enforces canonical statuses: On hold, Booked, Completed, Cancelled (BR-007)', () => {
      const csvContent = fs.readFileSync(path.join(seedDir, 'bookings.csv'), 'utf-8')
      const rows = parseCsv(csvContent)
      const canonicalStatuses = new Set(['On hold', 'Booked', 'Completed', 'Cancelled'])

      for (const row of rows) {
        expect(canonicalStatuses.has(row.status)).toBe(true)
      }
    })

    it('matches exact canonical status distribution from Session 5 seed package', () => {
      const csvContent = fs.readFileSync(path.join(seedDir, 'bookings.csv'), 'utf-8')
      const rows = parseCsv(csvContent)

      const counts = rows.reduce<Record<string, number>>((acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1
        return acc
      }, {})

      expect(counts['Booked']).toBe(3)
      expect(counts['Completed']).toBe(2)
      expect(counts['Cancelled']).toBe(2)
      expect(counts['On hold']).toBe(1)
      expect(rows.length).toBe(8)
    })
  })
})

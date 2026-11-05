// T018: COM125 / COM126 dialog state (spec-IAC #49, BR-009, BR-010, #42, #43).
import { describe, expect, it } from 'vitest'
import { attachState, sizeLabel } from '@/app/messages/attach-state'

const MB = 1_048_576
const f = (name: string, size = 2048) => ({ name, size })

describe('T018 | attachState', () => {
  it('nothing chosen: no rows, Send disabled, no message', () => {
    expect(attachState([], false)).toEqual({ rows: [], canSend: false })
  })

  it('valid files: type and size labels, Send enabled; disabled while a send is pending', () => {
    const state = attachState([f('bao-gia.pdf', 2048), f('so-do.png', 3 * MB)], false)
    expect(state.rows).toEqual([
      { name: 'bao-gia.pdf', typeLabel: 'PDF', sizeLabel: '2.0 KB' },
      { name: 'so-do.png', typeLabel: 'PNG', sizeLabel: '3.0 MB' },
    ])
    expect(state.canSend).toBe(true)
    expect(attachState([f('bao-gia.pdf')], true).canSend).toBe(false)
  })

  it('each invalid file shows its error and blocks Send', () => {
    const state = attachState([f('ok.docx'), f('ghi-chu.txt'), f('lon.xlsx', 10 * MB + 1), f('rong.jpg', 0)], false)
    expect(state.rows.map(r => r.error)).toEqual([
      undefined,
      'Định dạng không hỗ trợ (chỉ PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG)',
      'Tệp lớn hơn 10 MB',
      'Tệp rỗng',
    ])
    expect(state.canSend).toBe(false)
  })

  it('files under 1 KB show bytes, not "0.0 KB" (found in the demo)', () => {
    expect(sizeLabel(4)).toBe('4 B')
    expect(sizeLabel(1023)).toBe('1023 B')
    expect(sizeLabel(1024)).toBe('1.0 KB')
  })

  it('exactly 10 MB is valid; six files → "Tối đa 5 tệp" and Send disabled', () => {
    expect(attachState([f('lon.pdf', 10 * MB)], false).canSend).toBe(true)
    const six = attachState(Array.from({ length: 6 }, (_, i) => f(`f${i}.pdf`)), false)
    expect(six).toMatchObject({ canSend: false, message: 'Tối đa 5 tệp' })
  })
})

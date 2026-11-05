// T003: F-CHAT-05 file checks (BR-009, BR-010, SC-015, AC-IAC-FILE, spec-IAC #42, #43, #45).
import { describe, expect, it } from 'vitest'
import { classifyFile, validateBatch } from '@/lib/iac/chat-files'
import { MAX_BYTES, file } from './iac-attach-fixtures'

const errorsOf = (files: ReturnType<typeof file>[]) => {
  try {
    validateBatch(files)
    return null
  } catch (error) {
    return error as { code: string; statusCode: number; fileErrors?: { file_name: string; reason: string }[] }
  }
}

describe('T003 | classifyFile (#42)', () => {
  it.each([
    ['bao-gia.pdf', 'application/pdf'],
    ['hop-dong.doc', 'application/msword'],
    ['hop-dong.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['bang-gia.xls', 'application/vnd.ms-excel'],
    ['bang-gia.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['anh.jpg', 'image/jpeg'],
    ['anh.JPEG', 'image/jpeg'],
    ['So-Do.PNG', 'image/png'],
    ['ten.co.dau.cham.Pdf', 'application/pdf'],
  ])('%s → %s', (name, type) => {
    expect(classifyFile(name)).toBe(type)
  })

  it.each(['ghi-chu.txt', 'setup.exe', 'khong-duoi', 'anh.webp', 'pdf', '.pdf.zip'])('%s → unsupported', name => {
    expect(classifyFile(name)).toBeNull()
  })
})

describe('T003 | validateBatch (#43, #45)', () => {
  it('accepts 1 and 5 valid files, a file of exactly 10,485,760 bytes and duplicate names', () => {
    expect(errorsOf([file('a.pdf')])).toBeNull()
    expect(errorsOf([file('a.pdf'), file('a.pdf'), file('b.xlsx'), file('c.png'), file('d.docx')])).toBeNull()
    expect(errorsOf([file('lon.pdf', MAX_BYTES)])).toBeNull()
  })

  it('rejects 0 files and 6 files with 400 VALIDATION_ERROR (BR-010)', () => {
    expect(errorsOf([])).toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 })
    expect(errorsOf(Array.from({ length: 6 }, (_, i) => file(`f${i}.pdf`)))).toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 })
  })

  it('lists every invalid file with its reason; one bad file fails the batch (AC-IAC-FILE, SC-015)', () => {
    const error = errorsOf([file('ok.pdf'), file('ghi-chu.txt'), file('lon.xlsx', MAX_BYTES + 1), file('rong.png', '')])
    expect(error).toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 })
    expect(error!.fileErrors).toEqual([
      { file_name: 'ghi-chu.txt', reason: 'UNSUPPORTED_FORMAT' },
      { file_name: 'lon.xlsx', reason: 'FILE_TOO_LARGE' },
      { file_name: 'rong.png', reason: 'EMPTY_FILE' },
    ])
  })
})

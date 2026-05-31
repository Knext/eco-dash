import { describe, it, expect } from 'vitest'
import { parseKrxRows } from '@/lib/sources/krx'

// Shape mirrors a real MDCSTAT00702 (개별지수 PER/PBR/배당수익률) response:
// rows newest-first, dates as "YYYY/MM/DD", numerics as comma-grouped strings.
// PBR field is WT_STKPRC_NETASST_RTO, PER is WT_PER, div yield is DIV_YD.
const PBR = 'WT_STKPRC_NETASST_RTO'
const PER = 'WT_PER'

const sample = {
  output: [
    { TRD_DD: '2024/01/05', CLSPRC_IDX: '2,578.08', WT_PER: '18.20', WT_STKPRC_NETASST_RTO: '0.92', DIV_YD: '1.95' },
    { TRD_DD: '2024/01/04', CLSPRC_IDX: '2,587.02', WT_PER: '18.30', WT_STKPRC_NETASST_RTO: '0.93', DIV_YD: '1.94' },
    { TRD_DD: '2024/01/03', CLSPRC_IDX: '2,607.31', WT_PER: '18.45', WT_STKPRC_NETASST_RTO: '0.94', DIV_YD: '1.93' },
  ],
}

describe('parseKrxRows', () => {
  it('extracts the requested field keyed by date, sorted ascending', () => {
    const rows = parseKrxRows(sample, PBR)
    expect(rows).toEqual([
      { asOf: '2024-01-03', value: 0.94 },
      { asOf: '2024-01-04', value: 0.93 },
      { asOf: '2024-01-05', value: 0.92 },
    ])
  })

  it('reads the PER field when requested', () => {
    const rows = parseKrxRows(sample, PER)
    expect(rows.map((r) => r.value)).toEqual([18.45, 18.3, 18.2])
  })

  it('strips comma grouping from numeric values', () => {
    const rows = parseKrxRows({ output: [{ TRD_DD: '2024/01/03', [PBR]: '1,024.50' }] }, PBR)
    expect(rows).toEqual([{ asOf: '2024-01-03', value: 1024.5 }])
  })

  it('falls back to the OutBlock_1 envelope', () => {
    const rows = parseKrxRows({ OutBlock_1: [{ TRD_DD: '2024/01/03', [PBR]: '0.94' }] }, PBR)
    expect(rows).toEqual([{ asOf: '2024-01-03', value: 0.94 }])
  })

  it('skips rows with missing/unparseable date or value', () => {
    const rows = parseKrxRows(
      {
        output: [
          { TRD_DD: '2024/01/03', [PBR]: '0.94' },
          { TRD_DD: '', [PBR]: '0.99' },
          { TRD_DD: '2024/01/02', [PBR]: '-' },
          { [PBR]: '0.88' },
        ],
      },
      PBR,
    )
    expect(rows).toEqual([{ asOf: '2024-01-03', value: 0.94 }])
  })

  it('returns an empty array for an empty or shapeless response', () => {
    expect(parseKrxRows({}, PBR)).toEqual([])
    expect(parseKrxRows({ output: [] }, PBR)).toEqual([])
  })
})

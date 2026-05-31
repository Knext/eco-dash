import { describe, it, expect } from 'vitest'
import { parseMultplTable } from '@/lib/sources/multpl'

// Mirrors multpl.com's real <table id="datatable"> markup: a header row,
// then rows whose value cell may carry an <abbr>†</abbr> estimate marker.
const sample = `
<table id="datatable"><caption><p>† Estimate</p></caption>
<tr><th>Date</th><th>Value</th></tr>
<tr class="odd"><td>May 29, 2026</td><td><abbr title="Estimate">†</abbr>32.67</td></tr>
<tr class="even"><td>May 1, 2026</td><td><abbr title="Estimate">†</abbr>31.42</td></tr>
<tr class="odd"><td>Apr 1, 2026</td><td>29.72</td></tr>
</table>`

describe('parseMultplTable', () => {
  it('extracts date/value pairs sorted ascending, skipping the header', () => {
    expect(parseMultplTable(sample)).toEqual([
      { asOf: '2026-04-01', value: 29.72 },
      { asOf: '2026-05-01', value: 31.42 },
      { asOf: '2026-05-29', value: 32.67 },
    ])
  })

  it('strips the † estimate marker and surrounding tags from values', () => {
    const rows = parseMultplTable(
      `<table id="datatable"><tr class="odd"><td>Jun 30, 2025</td><td><abbr>†</abbr>5.01</td></tr></table>`,
    )
    expect(rows).toEqual([{ asOf: '2025-06-30', value: 5.01 }])
  })

  it('strips the &#x2002; en-space entity on historical rows', () => {
    const rows = parseMultplTable(
      `<table id="datatable"><tr class="even"><td>Jan 1, 1871</td><td>&#x2002;11.10</td></tr></table>`,
    )
    expect(rows).toEqual([{ asOf: '1871-01-01', value: 11.1 }])
  })

  it('strips comma grouping from large values', () => {
    const rows = parseMultplTable(
      `<table id="datatable"><tr><td>Jan 1, 2000</td><td>1,234.50</td></tr></table>`,
    )
    expect(rows).toEqual([{ asOf: '2000-01-01', value: 1234.5 }])
  })

  it('returns empty when the datatable is absent', () => {
    expect(parseMultplTable('<html><body>no table here</body></html>')).toEqual([])
  })

  it('ignores rows with an unparseable date', () => {
    const rows = parseMultplTable(
      `<table id="datatable"><tr><td>not a date</td><td>10</td></tr><tr><td>Mar 1, 2024</td><td>20</td></tr></table>`,
    )
    expect(rows).toEqual([{ asOf: '2024-03-01', value: 20 }])
  })
})

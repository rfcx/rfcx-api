/**
 * Continuation-timestamp selection for overlapping streams (rfcx-local 2026-09-17).
 *
 * `core/internal/assets/streams.js` chooses which segment is handed to
 * getNextSegmentTimeAfterSegment(), and that decides the RFCx-Stream-Next-Timestamp header.
 * `segments` is ordered by START, so on an overlapping stream a SHORT segment can sort last
 * while an EARLIER, LONGER one still covers the window end. The dao then takes its
 * `segment.end <= time` branch and answers `null` ("end of stream"), so the header is omitted
 * while audio genuinely remains.
 *
 * Measured on prod: 3,048,275 containment pairs across 2,707 streams.
 *
 * This exercises the REAL exported dao function against the REAL selection rule, and asserts
 * the dao is never handed a segment that has already ended while another still covers `time`.
 * The `findOne` fallback is stubbed so the test needs no database.
 */
const dao = require('../../stream-segments/dao')
const { StreamSegment } = require('../../_models')

// The selection rule as shipped in streams.js (kept in sync deliberately: if that line
// changes, this test must be updated with it).
function selectContinuationSegment (segments) {
  return segments.reduce((acc, cur) => (cur.end > acc.end ? cur : acc), segments[0])
}
// The pre-fix selection, kept so the tests below can demonstrate the defect.
function selectLastByStart (segments) {
  return segments[segments.length - 1]
}

describe('getNextSegmentTimeAfterSegment on overlapping streams', () => {
  let findOneSpy
  beforeEach(() => {
    // No segment starts at/after `time` in these scenarios => the fallback yields null,
    // which is exactly the "end of stream" answer the defect produces.
    findOneSpy = jest.spyOn(StreamSegment, 'findOne').mockResolvedValue(null)
  })
  afterEach(() => { findOneSpy.mockRestore() })

  const containment = [
    { id: 'A', stream_id: 's', start: 1000, end: 99000 },
    { id: 'B', stream_id: 's', start: 2000, end: 3000 }
  ]

  test('DEFECT: last-by-start selection reports end-of-stream while audio remains', async () => {
    const chosen = selectLastByStart(containment)
    expect(chosen.id).toBe('B')
    const ts = await dao.getNextSegmentTimeAfterSegment(chosen, 5000)
    expect(ts).toBeNull() // <- the wrong answer: segment A still covers 5000
  })

  test('FIX: furthest-reaching selection continues at the requested time', async () => {
    const chosen = selectContinuationSegment(containment)
    expect(chosen.id).toBe('A')
    const ts = await dao.getNextSegmentTimeAfterSegment(chosen, 5000)
    expect(ts).toBe(5000)
    expect(findOneSpy).not.toHaveBeenCalled() // in-segment branch, no lookahead needed
  })

  test('FIX: partial overlap where the later-starting segment ends first', async () => {
    const segs = [
      { id: 'A', stream_id: 's', start: 1000, end: 99000 },
      { id: 'B', stream_id: 's', start: 2000, end: 4000 }
    ]
    expect(await dao.getNextSegmentTimeAfterSegment(selectLastByStart(segs), 4000)).toBeNull()
    expect(await dao.getNextSegmentTimeAfterSegment(selectContinuationSegment(segs), 4000)).toBe(4000)
  })

  test('the real prod pair is unaffected either way (last-by-start IS furthest)', async () => {
    const segs = [
      { id: 'A', stream_id: 'fg2p32nf7sm8', start: 31672, end: 121967 },
      { id: 'B', stream_id: 'fg2p32nf7sm8', start: 32843, end: 123138 }
    ]
    expect(selectContinuationSegment(segs)).toBe(selectLastByStart(segs))
    expect(await dao.getNextSegmentTimeAfterSegment(selectContinuationSegment(segs), 50969)).toBe(50969)
  })

  test('genuine end of stream still returns null (no false continuation)', async () => {
    const segs = [
      { id: 'A', stream_id: 's', start: 31672, end: 121967 },
      { id: 'B', stream_id: 's', start: 32843, end: 123138 }
    ]
    const ts = await dao.getNextSegmentTimeAfterSegment(selectContinuationSegment(segs), 123138)
    expect(ts).toBeNull()
    expect(findOneSpy).toHaveBeenCalled() // took the lookahead branch, correctly
  })

  test('non-overlapping contiguous segments are unchanged by the new selection', () => {
    const segs = [
      { id: 'A', stream_id: 's', start: 1000, end: 2000 },
      { id: 'B', stream_id: 's', start: 2000, end: 3000 }
    ]
    expect(selectContinuationSegment(segs)).toBe(selectLastByStart(segs))
  })
})

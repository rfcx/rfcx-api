const { matchSegmentToRecording } = require('./index')

// Regression guard for the file_size defect fixed 2026-08-21.
//
// WHY THIS TEST EXISTS AND WHY IT IS HERE, NOT IN post.int.test.js:
// core/internal/ingest/post.int.test.js MOCKS createRecordingsFromSegments, so
// it captures the argument passed INTO this service and never executes
// matchSegmentToRecording() -- which is exactly where the value was dropped.
// A guard placed only there PASSES against the buggy code (verified), so it
// would have given false confidence. This test calls the mapping function
// directly, which is the boundary the regression actually lived at.
//
// THE DEFECT: matchSegmentToRecording() hardcoded `file_size: 0` from
// fc6049135 (2023-07-22, "create and update files in batches") until
// 2026-08-21. That commit switched segment creation to bulkCreate with a narrow
// `returning` set; file_size is not a stream_segments column, so it no longer
// survived the round trip and was pinned to 0 rather than left undefined.
// Consequence: EVERY Arbimon recording created through the ingest endpoint for
// ~3 years carries file_size = 0, while the audio object itself is fine.
// Verified live on a site uploading continuously across the commit date:
// 0/6661 zero-byte rows the week before, 6659/6659 the week after.

describe('matchSegmentToRecording', () => {
  const sfParams = {
    bit_rate: 320000,
    sample_rate: 48000,
    audio_codec: 'flac',
    filename: 'test.flac',
    meta: null
  }
  // start/end are Date objects in the real call path (the request converter
  // runs toMomentUtc, and the segment rows carry DataTypes.DATE(3)), so the
  // duration arithmetic below relies on Date subtraction.
  const segment = {
    stream_id: 'abcdefghijk0',
    start: new Date('2024-05-14T10:00:00.000Z'),
    end: new Date('2024-05-14T10:01:00.000Z'),
    sample_count: 2880000,
    file_extension: '.flac',
    file_size: 3333710
  }

  test('file_size is carried through from the segment (NOT hardcoded to 0)', () => {
    const recording = matchSegmentToRecording(sfParams, segment)
    expect(recording.file_size).toBe(3333710)
  })

  test('file_size falls back to 0 when the segment does not carry one', () => {
    const recording = matchSegmentToRecording(sfParams, { ...segment, file_size: undefined })
    expect(recording.file_size).toBe(0)
  })

  test('an explicit zero stays zero', () => {
    const recording = matchSegmentToRecording(sfParams, { ...segment, file_size: 0 })
    expect(recording.file_size).toBe(0)
  })

  test('the other mapped fields are unaffected', () => {
    const recording = matchSegmentToRecording(sfParams, segment)
    expect(recording.samples).toBe(2880000)
    expect(recording.duration).toBe(60)
    expect(recording.sample_rate).toBe(48000)
    expect(recording.site_external_id).toBe('abcdefghijk0')
  })
})

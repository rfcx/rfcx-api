process.env.FFMPEG_PATH = '/usr/local/bin/ffmpeg'
const shellModulePath = '../../utils/misc/shell'
jest.mock(shellModulePath)
const { runExec } = require(shellModulePath)
runExec.mockImplementation(() => {})
const segmentFileUtils = require('./segment-file-utils')

describe('convertAudio', () => {
  let spyError
  beforeAll(() => {
    spyError = jest.spyOn(global.console, 'error').mockImplementation(() => {})
  })
  afterAll(() => {
    spyError.mockRestore()
  })
  afterEach(() => {
    runExec.mockRestore()
  })
  describe('Single segment', () => {
    test('Should return correct simple command.', () => {
      const segments = [
        { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus' }
      ]
      const command = '/usr/local/bin/ffmpeg -i /tmp/source.opus -filter_complex "[0:a]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
      segmentFileUtils.convertAudio(segments, 1000, 2000, {}, '/tmp/destination.opus')
      expect(runExec).toHaveBeenCalledTimes(1)
      expect(runExec).toHaveBeenCalledWith(command)
    })

    describe('"sample_rate" attribute', () => {
      test('Should call console.error if segment does not have sample rate.', () => {
        const segments = [{ id: 1, start: 1000, end: 2000 }]
        segmentFileUtils.convertAudio(segments, 1100, 1900, {}, '/tmp/test.opus')
        expect(spyError).toHaveBeenCalledWith('Could not get sampleRate for segment "1"')
      })
      test('Should return correct command with undefined sample rate.', () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { } }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        segmentFileUtils.convertAudio(segments, 1100, 1900, {}, '/tmp/destination.opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
      test('Should return correct command with sample rate set to 0.', () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 0 } }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        segmentFileUtils.convertAudio(segments, 1100, 1900, {}, '/tmp/destination.opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
      test('Should return correct command for single segment with sample rate set to 24000.', () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        segmentFileUtils.convertAudio(segments, 1100, 1900, {}, '/tmp/destination.opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
      test('Should return correct command for single segment with sample rate set to 22579200.', () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 22579200 } }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=22579200[0resampled];[0resampled]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        segmentFileUtils.convertAudio(segments, 1100, 1900, {}, '/tmp/destination.opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
    })

    describe('gain attribute', () => {
      test('Should return correct command for single segment with gain defined to 0.', () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1,volume=0" -y -vn -ac 1 /tmp/destination.opus'
        segmentFileUtils.convertAudio(segments, 1100, 1900, { gain: 0 }, '/tmp/destination.opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })

      test('Should return correct command for single segment with gain defined to 0.5.', () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1,volume=0.5" -y -vn -ac 1 /tmp/destination.opus'
        segmentFileUtils.convertAudio(segments, 1100, 1900, { gain: 0.5 }, '/tmp/destination.opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })

      test('Should return correct command for single segment with gain defined to 1.', () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        segmentFileUtils.convertAudio(segments, 1100, 1900, { gain: 1 }, '/tmp/destination.opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })

      test('Should return correct command for single segment with gain defined to 1.5.', () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1,volume=1.5" -y -vn -ac 1 /tmp/destination.opus'
        segmentFileUtils.convertAudio(segments, 1100, 1900, { gain: 1.5 }, '/tmp/destination.opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })

      test('Should return correct command for single segment with gain defined to 9007199254740991.', () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1,volume=9007199254740991" -y -vn -ac 1 /tmp/destination.opus'
        segmentFileUtils.convertAudio(segments, 1100, 1900, { gain: 9007199254740991 }, '/tmp/destination.opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
    })

    describe('frequency attribute', () => {
      describe('audio', () => {
        test('Should return correct command for single segment with r defined to 0.200.', () => {
          const segments = [
            { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
          ]
          const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1,lowpass=f=200" -y -vn -ac 1 /tmp/destination.opus'
          segmentFileUtils.convertAudio(segments, 1100, 1900, { fileType: 'flac', clip: { top: 200, bottom: 0 } }, '/tmp/destination.opus')
          expect(runExec).toHaveBeenCalledTimes(1)
          expect(runExec).toHaveBeenCalledWith(command)
        })
        test('Should return correct command for single segment with r defined to 1500.3000.', () => {
          const segments = [
            { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
          ]
          const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1,highpass=f=1500,lowpass=f=3000" -y -vn -ac 1 /tmp/destination.opus'
          segmentFileUtils.convertAudio(segments, 1100, 1900, { fileType: 'flac', clip: { top: 3000, bottom: 1500 } }, '/tmp/destination.opus')
          expect(runExec).toHaveBeenCalledTimes(1)
          expect(runExec).toHaveBeenCalledWith(command)
        })
        test('Should return correct command for single segment with r defined to 5000.24000.', () => {
          const segments = [
            { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
          ]
          const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1,highpass=f=5000,lowpass=f=24000" -y -vn -ac 1 /tmp/destination.opus'
          segmentFileUtils.convertAudio(segments, 1100, 1900, { fileType: 'flac', clip: { top: 24000, bottom: 5000 } }, '/tmp/destination.opus')
          expect(runExec).toHaveBeenCalledTimes(1)
          expect(runExec).toHaveBeenCalledWith(command)
        })
        test('Should return correct command for single segment with r defined to 1500.3000 and gain defined to 1.5', () => {
          const segments = [
            { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
          ]
          const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1,volume=1.5,highpass=f=1500,lowpass=f=3000" -y -vn -ac 1 /tmp/destination.opus'
          segmentFileUtils.convertAudio(segments, 1100, 1900, { fileType: 'flac', gain: 1.5, clip: { top: 3000, bottom: 1500 } }, '/tmp/destination.opus')
          expect(runExec).toHaveBeenCalledTimes(1)
          expect(runExec).toHaveBeenCalledWith(command)
        })
      })
      describe('spectrogram', () => {
        test('Should return correct command for single segment with r defined to 0.200.', () => {
          const segments = [
            { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
          ]
          const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
          segmentFileUtils.convertAudio(segments, 1100, 1900, { fileType: 'spec', clip: { top: 200, bottom: 0 } }, '/tmp/destination.opus')
          expect(runExec).toHaveBeenCalledTimes(1)
          expect(runExec).toHaveBeenCalledWith(command)
        })
        test('Should return correct command for single segment with r defined to 1500.3000.', () => {
          const segments = [
            { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
          ]
          const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
          segmentFileUtils.convertAudio(segments, 1100, 1900, { fileType: 'spec', clip: { top: 3000, bottom: 1500 } }, '/tmp/destination.opus')
          expect(runExec).toHaveBeenCalledTimes(1)
          expect(runExec).toHaveBeenCalledWith(command)
        })
        test('Should return correct command for single segment with r defined to 5000.24000.', () => {
          const segments = [
            { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
          ]
          const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
          segmentFileUtils.convertAudio(segments, 1100, 1900, { fileType: 'spec', clip: { top: 24000, bottom: 5000 } }, '/tmp/destination.opus')
          expect(runExec).toHaveBeenCalledTimes(1)
          expect(runExec).toHaveBeenCalledWith(command)
        })
        test('Should return correct command for single segment with r defined to 1500.3000 and gain defined to 1.5', () => {
          const segments = [
            { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
          ]
          const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1,volume=1.5" -y -vn -ac 1 /tmp/destination.opus'
          segmentFileUtils.convertAudio(segments, 1100, 1900, { fileType: 'spec', gain: 1.5, clip: { top: 3000, bottom: 1500 } }, '/tmp/destination.opus')
          expect(runExec).toHaveBeenCalledTimes(1)
          expect(runExec).toHaveBeenCalledWith(command)
        })
      })
    })

    describe('Time ranges', () => {
      test('Should return correct command for range which starts before segment and ends with segment', () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -i /tmp/source.opus -filter_complex "[0:a]adelay=100ms[0delayed];[0delayed]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        segmentFileUtils.convertAudio(segments, 900, 2000, {}, '/tmp/destination.opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })

      test('Should return correct command for range which starts with segment and ends with segment', () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -i /tmp/source.opus -filter_complex "[0:a]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        segmentFileUtils.convertAudio(segments, 1000, 2000, {}, '/tmp/destination.opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })

      test('Should return correct command for range which starts inside segment and ends with segment', () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -i /tmp/source.opus -filter_complex "[0:a]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        segmentFileUtils.convertAudio(segments, 1100, 2000, {}, '/tmp/destination.opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })

      test('Should return correct command for range which starts before segment and ends inside segment', () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -t 900ms -i /tmp/source.opus -filter_complex "[0:a]adelay=100ms[0delayed];[0delayed]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        segmentFileUtils.convertAudio(segments, 900, 1900, {}, '/tmp/destination.opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })

      test('Should return correct command for range which starts before segment and ends after segment', () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -i /tmp/source.opus -filter_complex "[0:a]adelay=100ms[0delayed];[0delayed]apad=pad_dur=0.1[0padded];[0padded]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        segmentFileUtils.convertAudio(segments, 900, 2100, {}, '/tmp/destination.opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
    })
  })

  describe('Two segments', () => {
    test('Should return correct simple command.', () => {
      const segments = [
        { start: 1000, end: 2000, sourceFilePath: '/tmp/source1.opus' },
        { start: 2000, end: 3000, sourceFilePath: '/tmp/source2.opus' }
      ]
      const command = '/usr/local/bin/ffmpeg -i /tmp/source1.opus -i /tmp/source2.opus -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
      segmentFileUtils.convertAudio(segments, 1000, 3000, {}, '/tmp/destination.opus')
      expect(runExec).toHaveBeenCalledTimes(1)
      expect(runExec).toHaveBeenCalledWith(command)
    })
    describe('Time ranges', () => {
      test('Should return correct command for range which starts before first segment and ends with second segment', () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source1.opus' },
          { start: 2000, end: 3000, sourceFilePath: '/tmp/source2.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -i /tmp/source1.opus -i /tmp/source2.opus -filter_complex "[0:a]adelay=100ms[0delayed];[0delayed][1:a]concat=n=2:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        segmentFileUtils.convertAudio(segments, 900, 3000, {}, '/tmp/destination.opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
      test('Should return correct command for range which starts inside first segment and ends with second segment', () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source1.opus' },
          { start: 2000, end: 3000, sourceFilePath: '/tmp/source2.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -i /tmp/source1.opus -i /tmp/source2.opus -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        segmentFileUtils.convertAudio(segments, 1100, 3000, {}, '/tmp/destination.opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
      test('Should return correct command for range which starts before first segment and ends inside second segment', () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source1.opus' },
          { start: 2000, end: 3000, sourceFilePath: '/tmp/source2.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -i /tmp/source1.opus -t 900ms -i /tmp/source2.opus -filter_complex "[0:a]adelay=100ms[0delayed];[0delayed][1:a]concat=n=2:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        segmentFileUtils.convertAudio(segments, 900, 2900, {}, '/tmp/destination.opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
      test('Should return correct command for range which starts inside first segment and ends inside second segment', () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source1.opus' },
          { start: 2000, end: 3000, sourceFilePath: '/tmp/source2.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -i /tmp/source1.opus -t 900ms -i /tmp/source2.opus -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        segmentFileUtils.convertAudio(segments, 1100, 2900, {}, '/tmp/destination.opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
      test('Should return correct command for range which starts before first segment and ends after second segment', () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source1.opus' },
          { start: 2000, end: 3000, sourceFilePath: '/tmp/source2.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -i /tmp/source1.opus -i /tmp/source2.opus -filter_complex "[0:a]adelay=100ms[0delayed];[1:a]apad=pad_dur=0.1[1padded];[0delayed][1padded]concat=n=2:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        segmentFileUtils.convertAudio(segments, 900, 3100, {}, '/tmp/destination.opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
      test('Should return correct command for range which starts inside first segment and ends after second segment', () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source1.opus' },
          { start: 2000, end: 3000, sourceFilePath: '/tmp/source2.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -i /tmp/source1.opus -i /tmp/source2.opus -filter_complex "[1:a]apad=pad_dur=0.1[1padded];[0:a][1padded]concat=n=2:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        segmentFileUtils.convertAudio(segments, 1100, 3100, {}, '/tmp/destination.opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
      test('Should return correct command for range which starts before first segment, ends after second segment and there is a gap between segments', () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source1.opus' },
          { start: 2200, end: 3200, sourceFilePath: '/tmp/source2.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -i /tmp/source1.opus -i /tmp/source2.opus -filter_complex "[0:a]adelay=100ms[0delayed];[0delayed]apad=pad_dur=0.2[0padded];[1:a]apad=pad_dur=0.1[1padded];[0padded][1padded]concat=n=2:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        segmentFileUtils.convertAudio(segments, 900, 3300, {}, '/tmp/destination.opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
      test('Should return correct command for range which starts inside first segment, ends inside second segment and there is an overlay between segments', () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source1.opus' },
          { start: 1900, end: 2900, sourceFilePath: '/tmp/source2.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source1.opus -t 900ms -i /tmp/source2.opus -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        segmentFileUtils.convertAudio(segments, 1100, 2800, {}, '/tmp/destination.opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
    })
  })
})

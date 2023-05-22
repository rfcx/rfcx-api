process.env.FFMPEG_PATH = '/usr/local/bin/ffmpeg'
process.env.SOX_PATH = '/usr/local/bin/sox'
jest.mock('./shell')
const { runExec } = require('./shell')
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
      segmentFileUtils.convertAudio(segments, 1000, 2000, {}, '/tmp/destination.opus', 'opus')
      expect(runExec).toHaveBeenCalledTimes(1)
      expect(runExec).toHaveBeenCalledWith(command)
    })

    describe('"sample_rate" attribute', () => {
      test('Should call console.error if segment does not have sample rate.', async () => {
        const segments = [{ id: 1, start: 1000, end: 2000 }]
        await segmentFileUtils.convertAudio(segments, 1100, 1900, {}, '/tmp/test.opus')
        expect(spyError).toHaveBeenCalledWith('Could not get sampleRate for segment "1"')
      })
      test('Should return correct command with undefined sample rate.', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { } }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        await segmentFileUtils.convertAudio(segments, 1100, 1900, {}, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
      test('Should return correct command with sample rate set to 0.', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 0 } }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        await segmentFileUtils.convertAudio(segments, 1100, 1900, {}, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
      test('Should return correct command for single segment with sample rate set to 24000.', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        await segmentFileUtils.convertAudio(segments, 1100, 1900, {}, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
      test('Should return correct command for single segment with sample rate set to 22579200.', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 22579200 } }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=22579200[0resampled];[0resampled]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        await segmentFileUtils.convertAudio(segments, 1100, 1900, {}, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
    })

    describe('gain attribute', () => {
      test('Should return correct command for single segment with gain defined to 0.', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1,volume=0" -y -vn -ac 1 /tmp/destination.opus'
        await segmentFileUtils.convertAudio(segments, 1100, 1900, { gain: 0 }, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })

      test('Should return correct command for single segment with gain defined to 0.5.', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1,volume=0.5" -y -vn -ac 1 /tmp/destination.opus'
        await segmentFileUtils.convertAudio(segments, 1100, 1900, { gain: 0.5 }, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })

      test('Should return correct command for single segment with gain defined to 1.', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        await segmentFileUtils.convertAudio(segments, 1100, 1900, { gain: 1 }, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })

      test('Should return correct command for single segment with gain defined to 1.5.', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1,volume=1.5" -y -vn -ac 1 /tmp/destination.opus'
        await segmentFileUtils.convertAudio(segments, 1100, 1900, { gain: 1.5 }, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })

      test('Should return correct command for single segment with gain defined to 9007199254740991.', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1,volume=9007199254740991" -y -vn -ac 1 /tmp/destination.opus'
        await segmentFileUtils.convertAudio(segments, 1100, 1900, { gain: 9007199254740991 }, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
    })

    describe('frequency attribute', () => {
      describe('audio', () => {
        test('Should return correct command for single segment with r defined to 0.200.', async () => {
          const segments = [
            { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
          ]
          const command1 = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination_.opus'
          const command2 = '/usr/local/bin/sox /tmp/destination_.opus /tmp/destination.opus sinc -199'
          await segmentFileUtils.convertAudio(segments, 1100, 1900, { fileType: 'flac', clip: { top: 200, bottom: 0 } }, '/tmp/destination.opus', 'opus')
          expect(runExec).toHaveBeenCalledTimes(2)
          expect(runExec).toHaveBeenCalledWith(command1)
          expect(runExec).toHaveBeenCalledWith(command2)
        })
        test('Should return correct command for single segment with r defined to 1500.3000.', async () => {
          const segments = [
            { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
          ]
          const command1 = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination_.opus'
          const command2 = '/usr/local/bin/sox /tmp/destination_.opus /tmp/destination.opus sinc 1500-2999'
          await segmentFileUtils.convertAudio(segments, 1100, 1900, { fileType: 'flac', clip: { top: 3000, bottom: 1500 } }, '/tmp/destination.opus', 'opus')
          expect(runExec).toHaveBeenCalledTimes(2)
          expect(runExec).toHaveBeenCalledWith(command1)
          expect(runExec).toHaveBeenCalledWith(command2)
        })
        test('Should return correct command for single segment with r defined to 5000.24000.', async () => {
          const segments = [
            { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
          ]
          const command1 = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination_.opus'
          const command2 = '/usr/local/bin/sox /tmp/destination_.opus /tmp/destination.opus sinc 5000-23999'
          await segmentFileUtils.convertAudio(segments, 1100, 1900, { fileType: 'flac', clip: { top: 24000, bottom: 5000 } }, '/tmp/destination.opus', 'opus')
          expect(runExec).toHaveBeenCalledTimes(2)
          expect(runExec).toHaveBeenCalledWith(command1)
          expect(runExec).toHaveBeenCalledWith(command2)
        })
        test('Should return correct command for single segment with r defined to 1500.3000 and gain defined to 1.5', async () => {
          const segments = [
            { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
          ]
          const command1 = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1,volume=1.5" -y -vn -ac 1 /tmp/destination_.opus'
          const command2 = '/usr/local/bin/sox /tmp/destination_.opus /tmp/destination.opus sinc 1500-2999'
          await segmentFileUtils.convertAudio(segments, 1100, 1900, { fileType: 'flac', gain: 1.5, clip: { top: 3000, bottom: 1500 } }, '/tmp/destination.opus', 'opus')
          expect(runExec).toHaveBeenCalledTimes(2)
          expect(runExec).toHaveBeenCalledWith(command1)
          expect(runExec).toHaveBeenCalledWith(command2)
        })
      })
      describe('spectrogram', () => {
        test('Should return correct command for single segment with r defined to 0.200.', async () => {
          const segments = [
            { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
          ]
          const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
          await segmentFileUtils.convertAudio(segments, 1100, 1900, { fileType: 'spec', clip: { top: 200, bottom: 0 } }, '/tmp/destination.opus', 'opus')
          expect(runExec).toHaveBeenCalledTimes(1)
          expect(runExec).toHaveBeenCalledWith(command)
        })
        test('Should return correct command for single segment with r defined to 1500.3000.', async () => {
          const segments = [
            { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
          ]
          const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
          await segmentFileUtils.convertAudio(segments, 1100, 1900, { fileType: 'spec', clip: { top: 3000, bottom: 1500 } }, '/tmp/destination.opus', 'opus')
          expect(runExec).toHaveBeenCalledTimes(1)
          expect(runExec).toHaveBeenCalledWith(command)
        })
        test('Should return correct command for single segment with r defined to 5000.24000.', async () => {
          const segments = [
            { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
          ]
          const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
          await segmentFileUtils.convertAudio(segments, 1100, 1900, { fileType: 'spec', clip: { top: 24000, bottom: 5000 } }, '/tmp/destination.opus', 'opus')
          expect(runExec).toHaveBeenCalledTimes(1)
          expect(runExec).toHaveBeenCalledWith(command)
        })
        test('Should return correct command for single segment with r defined to 1500.3000 and gain defined to 1.5', async () => {
          const segments = [
            { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus', stream_source_file: { sample_rate: 24000 } }
          ]
          const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.opus -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1,volume=1.5" -y -vn -ac 1 /tmp/destination.opus'
          await segmentFileUtils.convertAudio(segments, 1100, 1900, { fileType: 'spec', gain: 1.5, clip: { top: 3000, bottom: 1500 } }, '/tmp/destination.opus', 'opus')
          expect(runExec).toHaveBeenCalledTimes(1)
          expect(runExec).toHaveBeenCalledWith(command)
        })
      })
    })

    describe('mp3 bitrate', () => {
      test('Should return correct command with bit rate set to 32k when mp3 is requested and original sample rate is 24000', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.wav', stream_source_file: { sample_rate: 24000 } }
        ]
        const command1 = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.wav -filter_complex "[0:a]aresample=24000[0resampled];[0resampled]concat=n=1:v=0:a=1" -y -vn -ac 1 -b:a 32k /tmp/destination_.mp3'
        const command2 = '/usr/local/bin/sox /tmp/destination_.mp3 /tmp/destination.mp3 sinc -199'
        await segmentFileUtils.convertAudio(segments, 1100, 1900, { fileType: 'mp3', clip: { top: 200, bottom: 0 } }, '/tmp/destination.mp3', 'mp3')
        expect(runExec).toHaveBeenCalledTimes(2)
        expect(runExec).toHaveBeenCalledWith(command1)
        expect(runExec).toHaveBeenCalledWith(command2)
      })
      test('Should return correct command with bit rate set to 32k when mp3 is requested and original sample rate is 38400', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.wav', stream_source_file: { sample_rate: 38400 } }
        ]
        const command1 = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.wav -filter_complex "[0:a]aresample=38400[0resampled];[0resampled]concat=n=1:v=0:a=1" -y -vn -ac 1 -b:a 32k /tmp/destination_.opus'
        const command2 = '/usr/local/bin/sox /tmp/destination_.opus /tmp/destination.opus sinc -199'
        await segmentFileUtils.convertAudio(segments, 1100, 1900, { fileType: 'mp3', clip: { top: 200, bottom: 0 } }, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(2)
        expect(runExec).toHaveBeenCalledWith(command1)
        expect(runExec).toHaveBeenCalledWith(command2)
      })
      test('Should return correct command with bit rate set to 96k when mp3 is requested and original sample rate is 48000', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.wav', stream_source_file: { sample_rate: 48000 } }
        ]
        const command1 = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source.wav -filter_complex "[0:a]aresample=48000[0resampled];[0resampled]concat=n=1:v=0:a=1" -y -vn -ac 1 -b:a 96k /tmp/destination_.opus'
        const command2 = '/usr/local/bin/sox /tmp/destination_.opus /tmp/destination.opus sinc -199'
        await segmentFileUtils.convertAudio(segments, 1100, 1900, { fileType: 'mp3', clip: { top: 200, bottom: 0 } }, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(2)
        expect(runExec).toHaveBeenCalledWith(command1)
        expect(runExec).toHaveBeenCalledWith(command2)
      })
    })

    describe('Time ranges', () => {
      test('Should return correct command for range which starts before segment and ends with segment', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -i /tmp/source.opus -filter_complex "[0:a]adelay=100ms[0delayed];[0delayed]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        await segmentFileUtils.convertAudio(segments, 900, 2000, {}, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })

      test('Should return correct command for range which starts with segment and ends with segment', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -i /tmp/source.opus -filter_complex "[0:a]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        await segmentFileUtils.convertAudio(segments, 1000, 2000, {}, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })

      test('Should return correct command for range which starts inside segment and ends with segment', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -i /tmp/source.opus -filter_complex "[0:a]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        await segmentFileUtils.convertAudio(segments, 1100, 2000, {}, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })

      test('Should return correct command for range which starts before segment and ends inside segment', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -t 900ms -i /tmp/source.opus -filter_complex "[0:a]adelay=100ms[0delayed];[0delayed]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        await segmentFileUtils.convertAudio(segments, 900, 1900, {}, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })

      test('Should return correct command for range which starts before segment and ends after segment', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -i /tmp/source.opus -filter_complex "[0:a]adelay=100ms[0delayed];[0delayed]apad=pad_dur=0.1[0padded];[0padded]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        await segmentFileUtils.convertAudio(segments, 900, 2100, {}, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
    })
  })

  describe('Two segments', () => {
    test('Should return correct simple command.', async () => {
      const segments = [
        { start: 1000, end: 2000, sourceFilePath: '/tmp/source1.opus' },
        { start: 2000, end: 3000, sourceFilePath: '/tmp/source2.opus' }
      ]
      const command = '/usr/local/bin/ffmpeg -i /tmp/source1.opus -i /tmp/source2.opus -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
      await segmentFileUtils.convertAudio(segments, 1000, 3000, {}, '/tmp/destination.opus', 'opus')
      expect(runExec).toHaveBeenCalledTimes(1)
      expect(runExec).toHaveBeenCalledWith(command)
    })
    describe('Time ranges', () => {
      test('Should return correct command for range which starts before first segment and ends with second segment', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source1.opus' },
          { start: 2000, end: 3000, sourceFilePath: '/tmp/source2.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -i /tmp/source1.opus -i /tmp/source2.opus -filter_complex "[0:a]adelay=100ms[0delayed];[0delayed][1:a]concat=n=2:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        await segmentFileUtils.convertAudio(segments, 900, 3000, {}, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
      test('Should return correct command for range which starts inside first segment and ends with second segment', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source1.opus' },
          { start: 2000, end: 3000, sourceFilePath: '/tmp/source2.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -i /tmp/source1.opus -i /tmp/source2.opus -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        await segmentFileUtils.convertAudio(segments, 1100, 3000, {}, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
      test('Should return correct command for range which starts before first segment and ends inside second segment', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source1.opus' },
          { start: 2000, end: 3000, sourceFilePath: '/tmp/source2.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -i /tmp/source1.opus -t 900ms -i /tmp/source2.opus -filter_complex "[0:a]adelay=100ms[0delayed];[0delayed][1:a]concat=n=2:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        await segmentFileUtils.convertAudio(segments, 900, 2900, {}, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
      test('Should return correct command for range which starts inside first segment and ends inside second segment', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source1.opus' },
          { start: 2000, end: 3000, sourceFilePath: '/tmp/source2.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -i /tmp/source1.opus -t 900ms -i /tmp/source2.opus -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        await segmentFileUtils.convertAudio(segments, 1100, 2900, {}, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
      test('Should return correct command for range which starts before first segment and ends after second segment', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source1.opus' },
          { start: 2000, end: 3000, sourceFilePath: '/tmp/source2.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -i /tmp/source1.opus -i /tmp/source2.opus -filter_complex "[0:a]adelay=100ms[0delayed];[1:a]apad=pad_dur=0.1[1padded];[0delayed][1padded]concat=n=2:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        await segmentFileUtils.convertAudio(segments, 900, 3100, {}, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
      test('Should return correct command for range which starts inside first segment and ends after second segment', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source1.opus' },
          { start: 2000, end: 3000, sourceFilePath: '/tmp/source2.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -i /tmp/source1.opus -i /tmp/source2.opus -filter_complex "[1:a]apad=pad_dur=0.1[1padded];[0:a][1padded]concat=n=2:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        await segmentFileUtils.convertAudio(segments, 1100, 3100, {}, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
      test('Should return correct command for range which starts before first segment, ends after second segment and there is a gap between segments', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source1.opus' },
          { start: 2200, end: 3200, sourceFilePath: '/tmp/source2.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -i /tmp/source1.opus -i /tmp/source2.opus -filter_complex "[0:a]adelay=100ms[0delayed];[0delayed]apad=pad_dur=0.2[0padded];[1:a]apad=pad_dur=0.1[1padded];[0padded][1padded]concat=n=2:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        await segmentFileUtils.convertAudio(segments, 900, 3300, {}, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
      test('Should return correct command for range which starts inside first segment, ends inside second segment and there is an overlay between segments', async () => {
        const segments = [
          { start: 1000, end: 2000, sourceFilePath: '/tmp/source1.opus' },
          { start: 1900, end: 2900, sourceFilePath: '/tmp/source2.opus' }
        ]
        const command = '/usr/local/bin/ffmpeg -ss 100ms -t 800ms -i /tmp/source1.opus -t 900ms -i /tmp/source2.opus -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        await segmentFileUtils.convertAudio(segments, 1100, 2800, {}, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })
    })
  })
})

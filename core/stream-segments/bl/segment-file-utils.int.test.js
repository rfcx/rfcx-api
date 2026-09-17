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

    describe('Overlapping near-duplicate segments (rfcx-local 2026-09-17 regression)', () => {
      // Real prod shape, stream fg2p32nf7sm8, offsets relative to 2015-01-01T00:05:00.000Z:
      //   A 00:05:31.672 -> 00:07:01.967   (31672 -> 121967)
      //   B 00:05:32.843 -> 00:07:03.138   (32843 -> 123138)  <- the recording the user selected
      // overlap = 89.124 s. Before the fix an INTERIOR segment got no `-t` at all, so ffmpeg
      // concatenated it WHOLE: a 8.980 s tile returned 98.102 s of audio (measured on prod).
      const segA = { start: 31672, end: 121967, sourceFilePath: '/tmp/A.opus' }
      const segB = { start: 32843, end: 123138, sourceFilePath: '/tmp/B.opus' }

      test('A tile INSIDE the overlap emits ONLY the covering slice, not a whole extra segment', async () => {
        // the tile that measured 98.102 s on prod (window 41989 -> 50969 = 8980 ms)
        const command = '/usr/local/bin/ffmpeg -ss 9146ms -t 8980ms -i /tmp/B.opus -filter_complex "[0:a]concat=n=1:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        await segmentFileUtils.convertAudio([segA, segB], 41989, 50969, {}, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })

      test('The emitted slices sum to the requested window, not to ~11x it', () => {
        const planned = segmentFileUtils.planSegmentSlices([segA, segB], 41989, 50969)
        const total = planned.reduce((acc, p) => {
          const remaining = (p.segment.end - p.segment.start) - p.seekMs
          return acc + (p.durationMs !== undefined ? p.durationMs : remaining)
        }, 0)
        expect(total).toBe(8980)
      })

      test('A segment fully covered by a later one is OMITTED, never emitted with -t 0ms', () => {
        // `-t 0ms` is IGNORED by ffmpeg (measured in the prod container: it writes the rest of
        // the file), so a zero-length contribution must not reach the command line at all.
        const planned = segmentFileUtils.planSegmentSlices([segA, segB], 41989, 50969)
        expect(planned).toHaveLength(1)
        expect(planned[0].segment.sourceFilePath).toBe('/tmp/B.opus')
        planned.forEach((p) => { expect(p.durationMs === undefined || p.durationMs > 0).toBe(true) })
      })

      test('A window spanning BOTH segments still hands over at the later segment start', async () => {
        // A contributes from the WINDOW start (32000) until B takes over at its own start
        // (32843) => 843 ms, seeking 328 ms into A. This case was already correct before the
        // fix, so this test guards that the rewrite PRESERVES it rather than proving a bug.
        const command = '/usr/local/bin/ffmpeg -ss 328ms -t 843ms -i /tmp/A.opus -i /tmp/B.opus -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1" -y -vn -ac 1 /tmp/destination.opus'
        await segmentFileUtils.convertAudio([segA, segB], 32000, 123138, {}, '/tmp/destination.opus', 'opus')
        expect(runExec).toHaveBeenCalledTimes(1)
        expect(runExec).toHaveBeenCalledWith(command)
      })

      test('Three overlapping near-duplicates collapse to the covering slices only', () => {
        const segC = { start: 34000, end: 124000, sourceFilePath: '/tmp/C.opus' }
        const planned = segmentFileUtils.planSegmentSlices([segA, segB, segC], 41989, 50969)
        expect(planned).toHaveLength(1)
        expect(planned[0].segment.sourceFilePath).toBe('/tmp/C.opus')
      })
    })
  })
})

const Promise = require('bluebird')
const ffmpeg = require('fluent-ffmpeg')
const fs = require('fs')

const audioFormatSettings = {

  mp3: {
    extension: 'mp3',
    codec: 'libmp3lame',
    outputFormat: 'mp3',
    mime: 'audio/mpeg',
    inputOptions: [],
    outputOptions: ['-b:a 32k'],
    maxValues: {
      sampleRate: 48000,
      maxOutputOptions: ['-b:a 96k']
    }
  },
  opus: {
    extension: 'opus',
    codec: 'libopus',
    outputFormat: 'opus',
    mime: 'audio/ogg',
    inputOptions: [],
    outputOptions: ['-b:a 16k', '-compression_level 9', '-application audio', '-vbr on'],
    maxValues: {
      sampleRate: 48000,
      maxOutputOptions: ['-b:a 48k', '-compression_level 9', '-application audio', '-vbr on']
    }
  },
  wav: {
    extension: 'wav',
    codec: 'pcm_s16le',
    outputFormat: 'wav',
    mime: 'audio/wav',
    inputOptions: ['-flags +bitexact'],
    outputOptions: [],
    maxValues: {
      sampleRate: 192000,
      maxOutputOptions: ['-flags +bitexact']
    }
  },
  flac: {
    extension: 'flac',
    codec: 'flac',
    outputFormat: 'flac',
    mime: 'audio/flac',
    inputOptions: [],
    outputOptions: ['-sample_fmt s16'],
    maxValues: {
      sampleRate: 192000,
      maxOutputOptions: ['-sample_fmt s16']
    }
  },
  m4a: {
    extension: 'm4a',
    codec: 'libfdk_aac',
    outputFormat: 'm4a',
    mime: 'audio/mp4',
    inputOptions: [],
    outputOptions: ['-b:a 16k'],
    maxValues: {
      sampleRate: 48000,
      maxOutputOptions: ['-b:a 48k']
    }
  }

}

exports.audioUtils = {

  formatSettings: audioFormatSettings,

  transcodeToFile: function (audioFormat, inputParams) {
    return new Promise(function (resolve, reject) {
      try {
        fs.stat(inputParams.sourceFilePath, function (statErr, fileStat) {
          if (statErr == null) {
            const transcodedFilePath = inputParams.sourceFilePath.substr(0, inputParams.sourceFilePath.lastIndexOf('.')) + '_.' + audioFormat

            const ffmpegInputOptions = getInputOptions(audioFormat, inputParams.enhanced)

            const copyCodecInsteadOfTranscode = (inputParams.copyCodecInsteadOfTranscode == null) ? false : inputParams.copyCodecInsteadOfTranscode

            const ffmpegOutputOptions = []
            if (inputParams.clipOffset != null) { ffmpegOutputOptions.push('-ss ' + inputParams.clipOffset) }
            if (inputParams.clipDuration != null) { ffmpegOutputOptions.push('-t ' + inputParams.clipDuration) }

            let preOutputOpts = []
            if (inputParams.sampleRate > (0.8 * audioFormatSettings[audioFormat].maxValues.sampleRate)) {
              inputParams.sampleRate = audioFormatSettings[audioFormat].maxValues.sampleRate
              preOutputOpts = getOutputOptions(audioFormat, inputParams.enhanced, true)
            } else if (!copyCodecInsteadOfTranscode) {
              preOutputOpts = getOutputOptions(audioFormat, inputParams.enhanced, false)
            }
            for (const i in preOutputOpts) { ffmpegOutputOptions.push(preOutputOpts[i]) }

            let cmd = new ffmpeg(inputParams.sourceFilePath) // eslint-disable-line new-cap
              .input(inputParams.sourceFilePath)
              .inputOptions(ffmpegInputOptions)
              .outputOptions(ffmpegOutputOptions)
              .outputFormat(audioFormatSettings[audioFormat].outputFormat)
              .audioCodec((copyCodecInsteadOfTranscode) ? 'copy' : audioFormatSettings[audioFormat].codec)
              .audioChannels((inputParams.enhanced) ? 2 : 1)

            if (inputParams.sampleRate) {
              cmd = cmd.audioFrequency(inputParams.sampleRate)
            }
            cmd.save(transcodedFilePath)
              .on('error', function (err, stdout, stderr) {
                console.error('an error occurred: ' + err.message + ', stdout: ' + stdout + ', stderr: ' + stderr)
                reject(err)
              })
              .on('end', function () {
                // Don't remove source file if ingest service is enabled
                if (process.env.INGEST_SERVICE_ENABLED !== 'true') {
                  fs.unlink(inputParams.sourceFilePath, function (e) { if (e) { console.error(e) } })
                }
                resolve(transcodedFilePath)
              })
          } else {
            console.error('failed to locate source audio | ')
            reject(new Error())
          }
        })
      } catch (err) {
        console.error('failed to transcode audio to ' + audioFormat + ' | ' + err)
        reject(new Error(err))
      }
    })
  }

}

function getInputOptions (format, isEnhanced) {
  const enhancedInputOptions = [
  ]
  const inputOptions = (isEnhanced) ? enhancedInputOptions : []
  for (const i in audioFormatSettings[format].inputOptions) { inputOptions.push(audioFormatSettings[format].inputOptions[i]) }
  return inputOptions
}

function getOutputOptions (format, isEnhanced, useMaxValues) {
  const enhancedOutputOptions = [
    '-filter_complex', '[0:a][1:a]amerge=inputs=2[aout]',
    '-map', '[aout]'
  ]
  const outputOptions = (isEnhanced) ? enhancedOutputOptions : []

  if (useMaxValues) {
    for (const i in audioFormatSettings[format].maxValues.maxOutputOptions) { outputOptions.push(audioFormatSettings[format].maxValues.maxOutputOptions[i]) }
  } else {
    for (const i in audioFormatSettings[format].outputOptions) { outputOptions.push(audioFormatSettings[format].outputOptions[i]) }
  }
  return outputOptions
}

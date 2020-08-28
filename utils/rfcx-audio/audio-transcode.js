var Promise = require('bluebird')
var ffmpeg = require('fluent-ffmpeg')
var fs = require('fs')

var audioFormatSettings = {

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
            var transcodedFilePath = inputParams.sourceFilePath.substr(0, inputParams.sourceFilePath.lastIndexOf('.')) + '_.' + audioFormat

            var ffmpegInputOptions = getInputOptions(audioFormat, inputParams.enhanced)

            var copyCodecInsteadOfTranscode = (inputParams.copyCodecInsteadOfTranscode == null) ? false : inputParams.copyCodecInsteadOfTranscode

            var ffmpegOutputOptions = []
            if (inputParams.clipOffset != null) { ffmpegOutputOptions.push('-ss ' + inputParams.clipOffset) }
            if (inputParams.clipDuration != null) { ffmpegOutputOptions.push('-t ' + inputParams.clipDuration) }

            var preOutputOpts = []
            if (inputParams.sampleRate > (0.8 * audioFormatSettings[audioFormat].maxValues.sampleRate)) {
              inputParams.sampleRate = audioFormatSettings[audioFormat].maxValues.sampleRate
              preOutputOpts = getOutputOptions(audioFormat, inputParams.enhanced, true)
            } else if (!copyCodecInsteadOfTranscode) {
              preOutputOpts = getOutputOptions(audioFormat, inputParams.enhanced, false)
            }
            for (const i in preOutputOpts) { ffmpegOutputOptions.push(preOutputOpts[i]) }

            new ffmpeg(inputParams.sourceFilePath) // eslint-disable-line new-cap
              .input(inputParams.sourceFilePath)
              .inputOptions(ffmpegInputOptions)
              .outputOptions(ffmpegOutputOptions)
              .outputFormat(audioFormatSettings[audioFormat].outputFormat)
              .audioCodec((copyCodecInsteadOfTranscode) ? 'copy' : audioFormatSettings[audioFormat].codec)
              .audioFrequency(inputParams.sampleRate)
              .audioChannels((inputParams.enhanced) ? 2 : 1)
            //       .audioBitrate(inputParams.bitRate)
              .save(transcodedFilePath)
              .on('error', function (err, stdout, stderr) {
                console.log('an error occurred: ' + err.message + ', stdout: ' + stdout + ', stderr: ' + stderr)
              })
              .on('end', function () {
                fs.unlink(inputParams.sourceFilePath, function (e) { if (e) { console.log(e) } })
                resolve(transcodedFilePath)
              })
          } else {
            console.log('failed to locate source audio | ')
            reject(new Error())
          }
        })
      } catch (err) {
        console.log('failed to transcode audio to ' + audioFormat + ' | ' + err)
        reject(new Error(err))
      }
    })
  }

}

function getInputOptions (format, isEnhanced) {
  var enhancedInputOptions = [
  ]
  var inputOptions = (isEnhanced) ? enhancedInputOptions : []
  for (const i in audioFormatSettings[format].inputOptions) { inputOptions.push(audioFormatSettings[format].inputOptions[i]) }
  return inputOptions
}

function getOutputOptions (format, isEnhanced, useMaxValues) {
  var enhancedOutputOptions = [
    '-filter_complex', '[0:a][1:a]amerge=inputs=2[aout]',
    '-map', '[aout]'
  ]
  var outputOptions = (isEnhanced) ? enhancedOutputOptions : []

  if (useMaxValues) {
    for (const i in audioFormatSettings[format].maxValues.maxOutputOptions) { outputOptions.push(audioFormatSettings[format].maxValues.maxOutputOptions[i]) }
  } else {
    for (const i in audioFormatSettings[format].outputOptions) { outputOptions.push(audioFormatSettings[format].outputOptions[i]) }
  }
  return outputOptions
}

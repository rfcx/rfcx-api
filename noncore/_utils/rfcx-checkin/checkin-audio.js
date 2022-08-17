const Promise = require('bluebird')
const models = require('../../_models')
const fs = require('fs')
const zlib = require('zlib')
const { fileSha1 } = require('../misc/sha1')
const aws = require('../../_utils/external/aws').aws()
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const audioUtils = require('../rfcx-audio').audioUtils
const assetUtils = require('../internal-rfcx/asset-utils').assetUtils
const cachedFiles = require('../internal-rfcx/cached-files').cachedFiles
const { baseInclude } = require('../../views/v1/models/guardian-audio').models

const moment = require('moment-timezone')
const urls = require('../misc/urls')

exports.audio = {

  info: function (audioFiles, apiUrlDomain, audioMeta, dbGuardian, dbCheckIn) {
    // REMOVE LATER
    // cached file garbage collection...
    if (Math.random() < 0.01) { // only do garbage collection ~1% of the time it's allowed
      cachedFiles.cacheDirectoryGarbageCollection()
    }

    const audioInfo = {}

    if (audioFiles) {
      // make sure the screenshot files is an array
      if (!Array.isArray(audioFiles)) { audioFiles = [audioFiles] }

      if (audioMeta.length === audioFiles.length) {
        for (const i in audioFiles) {
          const timeStamp = audioMeta[i][1]
          const timeStampDateObj = new Date(parseInt(timeStamp))

          audioInfo[timeStamp] = {

            guardian_id: dbGuardian.id,
            guardian_guid: dbGuardian.guid,
            checkin_id: dbCheckIn.id,
            checkin_guid: dbCheckIn.guid,
            site_id: dbGuardian.site_id,

            originalFilename: audioFiles[i].originalname,
            uploadLocalPath: audioFiles[i].path,
            unzipLocalPath: audioFiles[i].path.substr(0, audioFiles[i].path.lastIndexOf('.')) + '.' + audioMeta[i][2],
            wavAudioLocalPath: audioFiles[i].path.substr(0, audioFiles[i].path.lastIndexOf('.')) + '.wav',

            guardianSha1Hash: audioMeta[i][3],
            sha1Hash: null, // to be calculated following the uncompression
            size: null, // to be calculated following the uncompression

            dbAudioObj: null,
            audio_id: null,
            audio_guid: null,

            capture_format: null,
            capture_bitrate: (audioMeta[i][5] != null) ? parseInt(audioMeta[i][5]) : null,
            capture_sample_rate: (audioMeta[i][4] != null && audioMeta[i][4] !== '') ? parseInt(audioMeta[i][4]) : null,
            capture_sample_count: null,
            capture_encode_duration: (audioMeta[i][8] != null) ? parseInt(audioMeta[i][8]) : null,
            capture_file_extension: audioMeta[i][2],
            capture_codec: audioMeta[i][6],
            capture_is_vbr: (audioMeta[i][7].toLowerCase() === 'vbr'),

            timeStamp: timeStamp,
            measured_at: timeStampDateObj,
            api_token_guid: null,
            api_token: null,
            api_token_expires_at: null,
            api_url: null,
            api_url_domain: apiUrlDomain,
            isSaved: { db: false, s3: false, sqs: false },
            s3Path: assetUtils.getGuardianAssetStoragePath('audio', timeStampDateObj, dbGuardian.guid, audioMeta[i][2])
          }
        }
      } else {
        console.error("couldn't match audio meta to uploaded content | " + audioMeta)
      }
    }
    return audioInfo
  },

  processUpload: function (audioInfo) {
    return new Promise(function (resolve, reject) {
      try {
        // unzip uploaded audio file into upload directory
        audioInfo.unZipStream = fs.createWriteStream(audioInfo.unzipLocalPath)
        fs.createReadStream(audioInfo.uploadLocalPath)
          .pipe(zlib.createGunzip())
          .pipe(audioInfo.unZipStream)
        // when the output stream closes, proceed asynchronously...
        audioInfo.unZipStream.on('close', function () {
          // calculate checksum of unzipped file
          audioInfo.sha1Hash = fileSha1(audioInfo.unzipLocalPath)
          // compare to checksum received from guardian
          if (audioInfo.sha1Hash === audioInfo.guardianSha1Hash) {
            resolve(audioInfo)
          } else {
            console.error('checksum mismatch on uploaded (and unzipped) audio file | ' + audioInfo.sha1Hash + ' - ' + audioInfo.guardianSha1Hash)
            reject(new Error())
          }
        })
      } catch (err) {
        console.error(err)
        reject(new Error(err))
      }
    })
  },

  extractAudioFileMeta: function (audioInfo) {
    return new Promise(function (resolve, reject) {
      try {
        fs.stat(audioInfo.unzipLocalPath, function (statErr, fileStat) {
          if (statErr) { reject(statErr) }
          audioInfo.size = fileStat.size
          audioUtils.transcodeToFile('wav', {
            sourceFilePath: audioInfo.unzipLocalPath,
            sampleRate: audioInfo.capture_sample_rate,
            keepFile: true
          })
            .then(function (wavFilePath) {
              fs.stat(wavFilePath, async function (wavStatErr, wavFileStat) {
                if (wavStatErr !== null) { reject(wavStatErr) }
                audioInfo.wavAudioLocalPath = wavFilePath
                const { stdout, stderr } = await exec(`${process.env.SOX_PATH}i -s ${audioInfo.wavAudioLocalPath}`) // get sample count
                if (stderr) {
                  reject(stderr)
                }
                audioInfo.capture_sample_count = parseInt(stdout.trim())
                if (!audioInfo.capture_sample_rate) {
                  const { stdout, stderr } = await exec(`${process.env.SOX_PATH}i -r ${audioInfo.wavAudioLocalPath}`) // get sample rate
                  if (stderr) {
                    reject(stderr)
                  }
                  audioInfo.capture_sample_rate = parseInt(stdout.trim())
                }
                resolve()
              })
            })
        })
      } catch (err) {
        reject(err)
      }
    })
  },

  saveToDb: function (audioInfo) {
    let dbAudioLocal

    return models.GuardianAudio
      .findOrCreate({
        where: {
          sha1_checksum: audioInfo.sha1Hash
        },
        defaults: {
          guardian_id: audioInfo.guardian_id,
          site_id: audioInfo.site_id,
          check_in_id: audioInfo.checkin_id,
          sha1_checksum: audioInfo.sha1Hash,
          url: null, // "s3://"+process.env.ASSET_BUCKET_AUDIO+audioInfo.s3Path,
          original_filename: audioInfo.originalFilename,
          encode_duration: audioInfo.capture_encode_duration,
          measured_at: audioInfo.measured_at,
          measured_at_local: moment.tz(audioInfo.measured_at, (audioInfo.timezone || 'UTC')).format('YYYY-MM-DDTHH:mm:ss.SSS'),
          size: audioInfo.size,
          capture_sample_count: audioInfo.capture_sample_count
        }
      })
      .spread(function (dbAudio, wasCreated) {
        dbAudioLocal = dbAudio
        return models.GuardianAudioFormat
          .findOrCreate({
            where: {
              codec: audioInfo.capture_codec,
              mime: mimeTypeFromAudioCodec(audioInfo.capture_codec),
              file_extension: audioInfo.capture_file_extension,
              sample_rate: audioInfo.capture_sample_rate,
              target_bit_rate: audioInfo.capture_bitrate,
              is_vbr: audioInfo.capture_is_vbr
            }
          })
      })
      .spread(function (dbAudioFormat, wasCreated) {
        dbAudioLocal.format_id = dbAudioFormat.id
        return dbAudioLocal.save()
      })
      .then(function (dbAudio) {
        return dbAudio.reload({ include: baseInclude })
      })
      .then(function (dbAudio) {
        audioInfo.isSaved.db = true
        audioInfo.dbAudioObj = dbAudio
        audioInfo.audio_id = dbAudio.id
        audioInfo.audio_guid = dbAudio.guid
        return audioInfo
      })
  },

  saveToS3: function (audioInfo) {
    return new Promise(function (resolve, reject) {
      aws.s3(process.env.ASSET_BUCKET_AUDIO)
        .putFile(
          audioInfo.unzipLocalPath,
          audioInfo.s3Path,
          function (err, s3Res) {
            try { s3Res.resume() } catch (resumeErr) { console.error(resumeErr) }
            if (err) {
              console.error(err)
              reject(new Error(err))
            } else if ((s3Res.statusCode === 200) && aws.s3ConfirmSave(s3Res, audioInfo.s3Path)) {
              audioInfo.isSaved.s3 = true

              resolve(audioInfo)
            } else {
              reject(new Error('audio file could not be successfully saved'))
            }
          })
    })
  },

  rollBackCheckIn: function (audioInfo) {
    models.GuardianAudio.findOne({ where: { sha1_checksum: audioInfo.sha1Hash } }).then(function (dbAudio) { dbAudio.destroy().then(function () { console.info('deleted incomplete audio entry') }) }).catch(function (err) { console.error('failed to delete incomplete audio entry | ' + err) })

    models.GuardianCheckIn.findOne({ where: { id: audioInfo.checkin_id } }).then(function (dbCheckIn) { dbCheckIn.destroy().then(function () { console.info('deleted checkin entry') }) }).catch(function (err) { console.error('failed to delete checkin entry | ' + err) })

    this.cleanupCheckInFiles(audioInfo)
  },

  prepareWsObject: function (req, itemAudioInfo, dbGuardian, dbAudio) {
    const dbAudioObj = itemAudioInfo.dbAudioObj
    const timezone = dbGuardian.Site.timezone
    return {
      recordTime: {
        UTC: moment.tz(dbAudioObj.measured_at, timezone).toISOString(),
        localTime: moment.tz(dbAudioObj.measured_at, timezone).format(),
        timeZone: timezone
      },
      audioUrl: urls.getAudioAssetsUrl(req, dbAudioObj.guid, dbAudio.Format ? dbAudio.Format.file_extension : 'mp3'),
      location: {
        latitude: dbGuardian.latitude,
        longitude: dbGuardian.longitude,
        site: dbAudio.Site.guid
      },
      length: {
        samples: dbAudioObj.capture_sample_count,
        timeInMs: dbAudio.Format
          ? Math.round(1000 * dbAudioObj.capture_sample_count / dbAudio.Format.sample_rate)
          : null
      },
      format: {
        fileType: dbAudio.Format ? dbAudio.Format.mime : null,
        sampleRate: dbAudio.Format ? dbAudio.Format.sample_rate : null,
        bitDepth: itemAudioInfo.capture_bitrate
      },
      guardianGuid: dbGuardian.guid,
      audioGuid: dbAudio.guid
    }
  },

  strArrToJSArr: (str, delimA, delimB) => {
    if ((str == null) || (str.length === 0)) { return [] }
    try {
      const rtrnArr = []; const arr = str.split(delimA)
      if (arr.length > 0) {
        for (const i in arr) {
          rtrnArr.push(arr[i].split(delimB))
        }
        return rtrnArr
      } else {
        return []
      }
    } catch (e) {
      console.error(e)
      return []
    }
  },

  cleanupCheckInFiles: function (audioInfo) {
    fs.stat(audioInfo.uploadLocalPath, function (err, stat) {
      if (err == null) { fs.unlink(audioInfo.uploadLocalPath, function (e) { if (e) { console.error(e) } }) }
    })
    fs.stat(audioInfo.unzipLocalPath, function (err, stat) {
      if (err == null) { fs.unlink(audioInfo.unzipLocalPath, function (e) { if (e) { console.error(e) } }) }
    })
    fs.stat(audioInfo.wavAudioLocalPath, function (err, stat) {
      if (err == null) { fs.unlink(audioInfo.wavAudioLocalPath, function (e) { if (e) { console.error(e) } }) }
    })
  }

}

function mimeTypeFromAudioCodec (audioCodec) {
  if (audioCodec.toLowerCase() === 'aac') {
    return 'audio/mp4'
  } else if (audioCodec.toLowerCase() === 'opus') {
    return 'audio/ogg'
  } else if (audioCodec.toLowerCase() === 'flac') {
    return 'audio/flac'
  } else if (audioCodec.toLowerCase() === 'mp3') {
    return 'audio/mpeg'
  } else {
    return null
  }
}

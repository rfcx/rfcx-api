const models = require('../../_models')
const fs = require('fs')
const saveMeta = require('./mqtt-save-meta').saveMeta
const smsMessages = require('../rfcx-guardian/guardian-sms-database').messages
const { hashedCredentials } = require('../../../common/crypto/sha256')
const { sha1 } = require('../misc/sha1')
const Promise = require('bluebird')
const moment = require('moment-timezone')
const { parse: parseSensorValues } = require('./mqtt-sensorvalues-parse')
const { baseInclude } = require('../../views/v1/models/guardian-audio').models

exports.checkInDatabase = {

  getDbSite: function (checkInObj) {
    return models.GuardianSite
      .findOne({
        where: { id: checkInObj.db.dbGuardian.site_id }
      })
      .then((dbSite) => {
        if (!dbSite) {
          return Promise.reject(`Couldn't find site with id ${checkInObj.db.dbGuardian.site_id}`) // eslint-disable-line prefer-promise-reject-errors
        }
        checkInObj.db.dbSite = dbSite
        return checkInObj
      })
  },

  getDbGuardian: function (checkInObj) {
    // for dev purposes only... this rejects checkins from all but a specified guardian guid
    //    if (checkInObj.json.guardian.guid != "088567034852"/*"xxxxxxxxxxxx"*/) { return Promise.reject(`Skipped ${checkInObj.json.guardian.guid}`); }

    return models.Guardian
      .findOne({
        where: { guid: checkInObj.json.guardian.guid },
        include: [{ all: true }]
      })
      .then((dbGuardian) => {
        if (!dbGuardian) {
          return Promise.reject(`Couldn't find guardian with guid ${checkInObj.json.guardian.guid}`) // eslint-disable-line prefer-promise-reject-errors
        }
        checkInObj.db.dbGuardian = dbGuardian
        return checkInObj
      })
  },

  validateDbGuardianToken: function (checkInObj) {
    if (checkInObj.json.guardian_guid != null) {
      // Adding support for differently structured guardian JSON blobs, which don't support auth.
      // This supports guardian software deployed before May 2020.
      // THIS SHOULD BE REMOVED when those guardians are taken offline.
      console.info('token validation skipped for guardian ' + checkInObj.json.guardian.guid)
      return checkInObj
    } else if (checkInObj.json.guardian != null) {
      if (checkInObj.db.dbGuardian == null) {
        return Promise.reject(`Couldn't find guardian with guid ${checkInObj.json.guardian.guid}`) // eslint-disable-line prefer-promise-reject-errors
      } else if (checkInObj.meta.allow_without_auth_token) {
        console.info('auth token validation skipped for ' + checkInObj.json.guardian.guid)
        return checkInObj
      } else if ((checkInObj.json.guardian.token != null) && (checkInObj.db.dbGuardian.auth_token_hash === hashedCredentials(checkInObj.db.dbGuardian.auth_token_salt, checkInObj.json.guardian.token))) {
        console.info('auth token validated for ' + checkInObj.json.guardian.guid)
        return checkInObj
      }
    }
    console.warn(`Failed to verify guardian auth token for guardian with guid ${checkInObj.json.guardian.guid}`)
    return Promise.reject(`Failed to verify guardian auth token for guardian with guid ${checkInObj.json.guardian.guid}`) // eslint-disable-line prefer-promise-reject-errors
  },

  createDbCheckIn: function (checkInObj) {
    let opts
    try {
      const checkInStatArray = strArrToJSArr(checkInObj.json.checkins, '|', '*')
      checkInObj.json.checkins_to_verify = []
      for (const vInd in checkInStatArray) {
        checkInObj.json[checkInStatArray[vInd][0] + '_checkins'] = checkInStatArray[vInd][1]
        if (checkInStatArray[vInd].length > 3) {
          for (let i = 3; i < checkInStatArray[vInd].length; i++) {
            checkInObj.json.checkins_to_verify.push(checkInStatArray[vInd][i])
          }
        }
      }

      opts = {
        guardian_id: checkInObj.db.dbGuardian.id,
        site_id: checkInObj.db.dbGuardian.site_id,
        measured_at: new Date(parseInt(checkInObj.json.measured_at)),
        queued_at: new Date(parseInt(checkInObj.json.queued_at))
      }
    } catch (e) {
      return Promise.reject(e)
    }

    return models.GuardianCheckIn
      .create(opts)
      .then((dbCheckIn) => {
        checkInObj.db.dbCheckIn = dbCheckIn
        checkInObj.rtrn.obj.checkin_id = dbCheckIn.guid
        return checkInObj
      })
  },

  saveDbMessages: function (checkInObj) {
    const msgs = []
    let msgInfo
    const proms = []
    try {
      msgInfo = smsMessages.info(
        checkInObj.json.messages,
        checkInObj.db.dbGuardian.id,
        ((checkInObj.db.dbCheckIn != null) ? checkInObj.db.dbCheckIn.id : null)
      )
    } catch (e) {
      return Promise.reject(e)
    }

    for (const msgInfoInd in msgInfo) {
      msgs.push({ id: msgInfo[msgInfoInd].android_id })
      proms.push(smsMessages.save(msgInfo[msgInfoInd]))
    }
    return Promise.all(proms)
      .then(() => {
        checkInObj.rtrn.obj.messages = msgs
        return checkInObj
      })
  },

  createDbSaveMeta: function (checkInObj) {
    const guardianId = checkInObj.db.dbGuardian.id
    const checkInId = (checkInObj.db.dbCheckIn != null) ? checkInObj.db.dbCheckIn.id : null

    const proms = [
      saveMeta.DataTransfer(strArrToJSArr(checkInObj.json.data_transfer, '|', '*'), guardianId, checkInId),
      saveMeta.CPU(strArrToJSArr(checkInObj.json.cpu, '|', '*'), guardianId, checkInId),
      saveMeta.Battery(strArrToJSArr(checkInObj.json.battery, '|', '*'), guardianId, checkInId),
      saveMeta.Network(strArrToJSArr(checkInObj.json.network, '|', '*'), guardianId, checkInId),
      saveMeta.LightMeter(strArrToJSArr(checkInObj.json.lightmeter, '|', '*'), guardianId, checkInId),
      saveMeta.Accelerometer(strArrToJSArr(checkInObj.json.accelerometer, '|', '*'), guardianId, checkInId),
      saveMeta.Storage(strArrToJSArr(checkInObj.json.storage, '|', '*'), guardianId, checkInId),
      saveMeta.Memory(strArrToJSArr(checkInObj.json.memory, '|', '*'), guardianId, checkInId),
      saveMeta.GeoPosition(strArrToJSArr(checkInObj.json.geoposition, '|', '*'), guardianId, checkInId),
      saveMeta.DateTimeOffset(strArrToJSArr(checkInObj.json.datetime_offsets, '|', '*'), guardianId, checkInId),
      saveMeta.MqttBrokerConnection(strArrToJSArr(checkInObj.json.broker_connections, '|', '*'), guardianId, checkInId),
      saveMeta.Detections(checkInObj.json.detections ? checkInObj.json.detections.split('|') : [], checkInObj.db.dbGuardian.stream_id),

      saveMeta.RebootEvents(strArrToJSArr(checkInObj.json.reboots, '|', '*'), guardianId, checkInId),
      saveMeta.SoftwareRoleVersion(strArrToJSArr(checkInObj.json.software, '|', '*'), guardianId),
      saveMeta.PreviousCheckIns(strArrToJSArr(checkInObj.json.previous_checkins, '|', '*')),

      saveMeta.CheckInStatus(strArrToJSArr(checkInObj.json.checkins, '|', '*'), guardianId, checkInObj.json.measured_at),

      saveMeta.SensorValues((checkInObj.json.s ? checkInObj.json.s.split('|') : []).map(p => parseSensorValues(p)), guardianId),
      saveMeta.SentinelPower(strArrToJSArr(checkInObj.json.sentinel_power, '|', '*'), guardianId, checkInId),
      saveMeta.SentinelSensor('accelerometer', strArrToJSArr(checkInObj.json.sentinel_sensor, '|', '*'), guardianId, checkInId),
      saveMeta.SentinelSensor('compass', strArrToJSArr(checkInObj.json.sentinel_sensor, '|', '*'), guardianId, checkInId),

      saveMeta.Device((checkInObj.json.device == null) ? {} : checkInObj.json.device, guardianId),

      saveMeta.SwarmDiagnostics(strArrToJSArr(checkInObj.json.swm, '|', '*'), guardianId, checkInId)
    ]

    return Promise.all(proms)
      .then(() => {
        return checkInObj
      })
  },

  updateDbMetaAssetsExchangeLog: function (checkInObj) {
    const guardianId = checkInObj.db.dbGuardian.id
    // arrays of return values for checkin response json
    const metaReturnArray = []; const detectionsReturnArray = []; const purgedReturnArray = []; const unconfirmedReturnArray = []; const receivedReturnArray = []; const receivedIdArray = []

    const proms = []
    // create meta asset entries in database
    if (checkInObj.json.meta_ids != null) {
      for (let i = 0; i < checkInObj.json.meta_ids.length; i++) {
        const prom = models.GuardianMetaAssetExchangeLog.findOrCreate({
          where: {
            guardian_id: guardianId,
            asset_type: 'meta',
            asset_id: checkInObj.json.meta_ids[i]
          }
        })
        metaReturnArray.push({ id: checkInObj.json.meta_ids[i].toString() })
        proms.push(prom)
      }
    }
    // create detections asset entries in database
    if (checkInObj.json.detection_ids != null) {
      for (let i = 0; i < checkInObj.json.detection_ids.length; i++) {
        const prom = models.GuardianMetaAssetExchangeLog.findOrCreate({
          where: {
            guardian_id: guardianId,
            asset_type: 'detections',
            asset_id: checkInObj.json.detection_ids[i]
          }
        })
        detectionsReturnArray.push({ id: checkInObj.json.detection_ids[i] })
        proms.push(prom)
      }
    }
    return Promise.all(proms)
      .then(async () => {
        // parse list of audio ids marked as 'sent' by guardian, confirm that they are present in exchange log table
        const promsExchLogs = []
        if (checkInObj.json.checkins_to_verify != null) {
          for (let i = 0; i < checkInObj.json.checkins_to_verify.length; i++) {
            const prom = models.GuardianMetaAssetExchangeLog.findOne({
              where: {
                guardian_id: guardianId,
                asset_type: 'audio',
                asset_id: checkInObj.json.checkins_to_verify[i]
              }
            })
              .then((dbAssetEntry) => {
                if (dbAssetEntry != null) {
                  receivedReturnArray.push({ type: 'audio', id: dbAssetEntry.asset_id.toString() })
                  receivedIdArray.push(dbAssetEntry.asset_id)
                }
              })
            promsExchLogs.push(prom)
          }
        }
        await Promise.all(promsExchLogs)

        // parse list of purged assets from guardian, delete them from database and return list
        const dbMetaPurgedAssets = []
        const metaPurgedAssets = strArrToJSArr(checkInObj.json.purged, '|', '*')
        for (const asstInd in metaPurgedAssets) {
          if (metaPurgedAssets[asstInd][1] != null) {
            dbMetaPurgedAssets.push({
              guardian_id: guardianId,
              asset_type: metaPurgedAssets[asstInd][0],
              asset_id: metaPurgedAssets[asstInd][1]
            })
            purgedReturnArray.push({ type: metaPurgedAssets[asstInd][0], id: metaPurgedAssets[asstInd][1].toString() })
          }
        }
        if (dbMetaPurgedAssets.length > 0) {
          await models.GuardianMetaAssetExchangeLog.destroy({ where: { [models.Sequelize.Op.or]: dbMetaPurgedAssets } })
        }
      })
      .then(() => {
        if ((checkInObj.json.checkins_to_verify != null) && (checkInObj.json.checkins_to_verify.length > 0)) {
          for (let i = 0; i < checkInObj.json.checkins_to_verify.length; i++) {
            if (receivedIdArray.indexOf(checkInObj.json.checkins_to_verify[i]) < 0) {
              unconfirmedReturnArray.push({ type: 'audio', id: checkInObj.json.checkins_to_verify[i].toString() })
            }
          }
        }

        // add checkin response json to overall checkInObj
        checkInObj.rtrn.obj.meta = metaReturnArray
        checkInObj.rtrn.obj.detections = detectionsReturnArray
        checkInObj.rtrn.obj.purged = purgedReturnArray
        checkInObj.rtrn.obj.received = receivedReturnArray
        checkInObj.rtrn.obj.unconfirmed = unconfirmedReturnArray

        return checkInObj
      })
  },

  syncGuardianPrefs: function (checkInObj) {
    let prefsReturnArray = []

    if (checkInObj.json.prefs == null) { checkInObj.json.prefs = { sha1: '', vals: {} } }
    if (checkInObj.json.prefs.sha1 == null) { checkInObj.json.prefs.sha1 = '' }
    if (checkInObj.json.prefs.vals == null) { checkInObj.json.prefs.vals = {} }

    const prefsDb = { sha1: '', vals: {}, cnt: 0, blobForSha1: '' }
    const prefsJson = { sha1: checkInObj.json.prefs.sha1, vals: checkInObj.json.prefs.vals, cnt: 0 }
    const prefsSha1CharLimit = prefsJson.sha1.length
    for (const prefKey in prefsJson.vals) { prefsJson.cnt++ } // eslint-disable-line no-unused-vars

    // retrieve, sort and take checksum of prefs rows for this guardian in the database
    return models.GuardianSoftwarePrefs.findAll({
      where: { guardian_id: checkInObj.db.dbGuardian.id }, order: [['pref_key', 'ASC']], limit: 150
    }).then((dbPrefs) => {
      const prefsBlobArr = []
      if (dbPrefs.length > 0) {
        for (const prefRow in dbPrefs) {
          prefsBlobArr.push([dbPrefs[prefRow].pref_key, dbPrefs[prefRow].pref_value].join('*'))
          prefsDb[dbPrefs[prefRow].pref_key] = dbPrefs[prefRow].pref_value
        }
      }
      prefsDb.blobForSha1 = prefsBlobArr.join('|')
      prefsDb.sha1 = sha1(prefsDb.blobForSha1)

      const prefsFindOrCreatePromises = []
      if ((prefsJson.sha1 !== '') && (prefsJson.sha1.substr(0, prefsSha1CharLimit) !== prefsDb.sha1.substr(0, prefsSha1CharLimit))) {
        prefsReturnArray = [{ sha1: prefsDb.sha1.substr(0, prefsSha1CharLimit) }]

        if (prefsJson.cnt > 0) {
          return models.GuardianSoftwarePrefs.destroy({
            where: { guardian_id: checkInObj.db.dbGuardian.id }
          }).then(() => {
            for (const prefKey in prefsJson.vals) {
              const prom = models.GuardianSoftwarePrefs.findOrCreate({
                where: {
                  guardian_id: checkInObj.db.dbGuardian.id,
                  pref_key: prefKey,
                  pref_value: prefsJson.vals[prefKey]
                }
              })
              prefsFindOrCreatePromises.push(prom)
            }

            return Promise.all(prefsFindOrCreatePromises)
              .then(() => {
                return models.GuardianSoftwarePrefs.findAll({
                  where: { guardian_id: checkInObj.db.dbGuardian.id }, order: [['pref_key', 'ASC']], limit: 150
                }).then((dbPrefs) => {
                  const prefsBlobArr = []
                  if (dbPrefs.length > 0) {
                    for (const prefRow in dbPrefs) {
                      prefsBlobArr.push([dbPrefs[prefRow].pref_key, dbPrefs[prefRow].pref_value].join('*'))
                      prefsDb[dbPrefs[prefRow].pref_key] = dbPrefs[prefRow].pref_value
                    }
                  }
                  prefsDb.blobForSha1 = prefsBlobArr.join('|')
                  prefsDb.sha1 = sha1(prefsDb.blobForSha1)
                  prefsReturnArray = [{ sha1: prefsDb.sha1.substr(0, prefsSha1CharLimit) }]
                }).then(() => {
                  return Promise.all(prefsFindOrCreatePromises)
                })
              })
          })
        }
      } else if (prefsJson.cnt > 0) {
        prefsReturnArray = [{ sha1: prefsDb.sha1.substr(0, prefsSha1CharLimit) }]
      }
    }).then(() => {
      checkInObj.rtrn.obj.prefs = prefsReturnArray
      return checkInObj
    })
  },

  createDbAudio: async function (checkInObj) {
    const [dbAudioFormat] = await models.GuardianAudioFormat.findOrCreate({
      where: {
        codec: checkInObj.audio.meta.audioCodec,
        mime: checkInObj.audio.meta.mimeType,
        file_extension: checkInObj.audio.meta.fileExtension,
        sample_rate: checkInObj.audio.meta.sampleRate,
        target_bit_rate: checkInObj.audio.meta.bitRate,
        is_vbr: checkInObj.audio.meta.isVbr
      }
    })
    const [dbAudio] = await models.GuardianAudio.findOrCreate({
      where: {
        sha1_checksum: checkInObj.audio.meta.sha1CheckSum
      },
      defaults: {
        guardian_id: checkInObj.db.dbGuardian.id,
        site_id: checkInObj.db.dbGuardian.site_id,
        check_in_id: checkInObj.db.dbCheckIn.id,
        sha1_checksum: checkInObj.audio.meta.sha1CheckSum,
        url: null,
        encode_duration: checkInObj.audio.meta.encodeDuration,
        measured_at: checkInObj.audio.meta.measuredAt,
        measured_at_local: moment.tz(checkInObj.audio.meta.measuredAt, (checkInObj.db.dbSite.timezone || 'UTC')).format('YYYY-MM-DDTHH:mm:ss.SSS'),
        capture_sample_count: checkInObj.audio.meta.captureSampleCount,
        size: checkInObj.audio.meta.size,
        format_id: dbAudioFormat.id
      }
    })
    await models.GuardianMetaAssetExchangeLog.findOrCreate({
      where: {
        guardian_id: checkInObj.db.dbGuardian.id,
        asset_type: 'audio',
        asset_id: checkInObj.audio.metaArr[1]
      }
    })
    console.log('update last_audio_sync to', dbAudio.created_at, 'for', checkInObj.db.dbGuardian.id)
    await models.Guardian.update({ last_audio_sync: dbAudio.created_at }, { where: { id: checkInObj.db.dbGuardian.id } })
    checkInObj.db.dbAudio = await dbAudio.reload({ include: baseInclude })
    checkInObj.rtrn.obj.audio.push({ id: checkInObj.audio.metaArr[1] })
    return checkInObj
  },

  createDbScreenShot: function (checkInObj) {
    if (!checkInObj.screenshots.filePath) {
      return Promise.resolve(checkInObj)
    }

    return new Promise((resolve, reject) => {
      fs.stat(checkInObj.screenshots.filePath, function (statErr, fileStat) {
        if (statErr) {
          return reject(statErr)
        }

        let defaults = {}
        try {
          defaults = {
            guardian_id: checkInObj.db.dbGuardian.id,
            sha1_checksum: checkInObj.screenshots.metaArr[3],
            url: null,
            captured_at: new Date(parseInt(checkInObj.screenshots.metaArr[1])),
            size: fileStat.size
          }
        } catch (e) {
          return reject(e)
        }

        models.GuardianMetaScreenShot.findOrCreate({
          where: {
            sha1_checksum: checkInObj.screenshots.metaArr[3]
          },
          defaults
        })
          .then(function (dbScreenShot) {
            models.GuardianMetaAssetExchangeLog.findOrCreate({
              where: {
                guardian_id: checkInObj.db.dbGuardian.id,
                asset_type: 'screenshot',
                asset_id: checkInObj.screenshots.metaArr[1]
              }
            })
              .then(() => {
                checkInObj.db.dbScreenShot = dbScreenShot
                checkInObj.rtrn.obj.screenshots.push({ id: checkInObj.screenshots.metaArr[1] })
                resolve(checkInObj)
              })
          })
          .catch((err) => {
            reject(err)
          })
      })
    })
  },

  createDbLogFile: function (checkInObj) {
    if (!checkInObj.logs.filePath) {
      return Promise.resolve(checkInObj)
    }

    return new Promise((resolve, reject) => {
      fs.stat(checkInObj.logs.filePath, (statErr, fileStat) => {
        if (statErr) {
          return reject(statErr)
        }

        let defaults = {}
        try {
          defaults = {
            guardian_id: checkInObj.db.dbGuardian.id,
            sha1_checksum: checkInObj.logs.metaArr[3],
            url: null,
            captured_at: new Date(parseInt(checkInObj.logs.metaArr[1])),
            size: fileStat.size
          }
        } catch (e) {
          return reject(e)
        }

        models.GuardianMetaLog.findOrCreate({
          where: {
            sha1_checksum: checkInObj.logs.metaArr[3]
          },
          defaults
        })
          .then(function (dbLogs) {
            models.GuardianMetaAssetExchangeLog.findOrCreate({
              where: {
                guardian_id: checkInObj.db.dbGuardian.id,
                asset_type: 'log',
                asset_id: checkInObj.logs.metaArr[1]
              }
            })
              .then(() => {
                checkInObj.db.dbLogs = dbLogs
                checkInObj.rtrn.obj.logs.push({ id: checkInObj.logs.metaArr[1] })
                resolve(checkInObj)
              })
          })
          .catch((err) => {
            reject(err)
          })
      })
    })
  },

  createDbMetaPhoto: function (checkInObj) {
    if (!checkInObj.photos.filePath) {
      return Promise.resolve(checkInObj)
    }

    return new Promise((resolve, reject) => {
      fs.stat(checkInObj.photos.filePath, (statErr, fileStat) => {
        if (statErr) {
          return reject(statErr)
        }

        let defaults = {}
        try {
          defaults = {
            guardian_id: checkInObj.db.dbGuardian.id,
            sha1_checksum: checkInObj.photos.metaArr[3],
            url: null,
            captured_at: new Date(parseInt(checkInObj.photos.metaArr[1])),
            width: parseInt(checkInObj.photos.metaArr[4]),
            height: parseInt(checkInObj.photos.metaArr[5]),
            format: checkInObj.photos.metaArr[2],
            size: fileStat.size
          }
        } catch (e) {
          return reject(e)
        }

        models.GuardianMetaPhoto.findOrCreate({
          where: {
            sha1_checksum: checkInObj.photos.metaArr[3]
          },
          defaults
        })
          .then(function (dbPhotos) {
            models.GuardianMetaAssetExchangeLog.findOrCreate({
              where: {
                guardian_id: checkInObj.db.dbGuardian.id,
                asset_type: 'photo',
                asset_id: checkInObj.photos.metaArr[1]
              }
            })
              .then(() => {
                checkInObj.db.dbPhotos = dbPhotos
                checkInObj.rtrn.obj.photos.push({ id: checkInObj.photos.metaArr[1] })
                resolve(checkInObj)
              })
          })
          .catch((err) => {
            reject(err)
          })
      })
    })
  },

  createDbMetaVideo: function (checkInObj) {
    if (!checkInObj.videos.filePath) {
      return Promise.resolve(checkInObj)
    }

    return new Promise((resolve, reject) => {
      fs.stat(checkInObj.videos.filePath, (statErr, fileStat) => {
        if (statErr) {
          return reject(statErr)
        }

        let defaults = {}
        try {
          defaults = {
            guardian_id: checkInObj.db.dbGuardian.id,
            sha1_checksum: checkInObj.videos.metaArr[3],
            url: null,
            captured_at: new Date(parseInt(checkInObj.videos.metaArr[1])),
            width: parseInt(checkInObj.videos.metaArr[4]),
            height: parseInt(checkInObj.videos.metaArr[5]),
            format: checkInObj.videos.metaArr[2],
            size: fileStat.size
          }
        } catch (e) {
          return reject(e)
        }

        models.GuardianMetaVideo.findOrCreate({
          where: {
            sha1_checksum: checkInObj.videos.metaArr[3]
          },
          defaults
        })
          .then(function (dbVideos) {
            models.GuardianMetaAssetExchangeLog.findOrCreate({
              where: {
                guardian_id: checkInObj.db.dbGuardian.id,
                asset_type: 'video',
                asset_id: checkInObj.videos.metaArr[1]
              }
            })
              .then(() => {
                checkInObj.db.dbVideos = dbVideos
                checkInObj.rtrn.obj.videos.push({ id: checkInObj.videos.metaArr[1] })
                resolve(checkInObj)
              })
          })
          .catch((err) => {
            reject(err)
          })
      })
    })
  },

  setGuardianCoordinates: (checkInObj) => {
    if (!checkInObj.json.geoposition) {
      return Promise.resolve(checkInObj)
    }

    const coordsArr = strArrToJSArr(checkInObj.json.geoposition, '|', '*')
    if (!coordsArr.length) {
      return Promise.resolve(checkInObj)
    }
    // get only last coordinate in array
    const lastCoord = coordsArr[coordsArr.length - 1]
    const latitude = parseFloat(lastCoord[1].split(',')[0])
    const longitude = parseFloat(lastCoord[1].split(',')[1])
    const accuracy = parseInt(lastCoord[2].split(',')[0])

    // do not update coordinates if they were not changed or latitude or longitude are undefined or zero
    // only save coordinates if the accuracy of the measurement is within 50 meters
    if (!!latitude && !!longitude && accuracy <= 50 && (checkInObj.db.dbGuardian.latitude !== latitude) || (checkInObj.db.dbGuardian.longitude !== longitude)) { // eslint-disable-line no-mixed-operators
      checkInObj.db.dbGuardian.latitude = latitude
      checkInObj.db.dbGuardian.longitude = longitude

      return checkInObj.db.dbGuardian.save()
        .then(() => {
          return checkInObj.db.dbGuardian.reload({ include: [{ all: true }] })
        })
        .then((dbGuardian) => {
          checkInObj.db.dbGuardian = dbGuardian
          return checkInObj
        })
    } else {
      return Promise.resolve(checkInObj)
    }
  },

  finalizeCheckIn: function (checkInObj) {
    try {
      checkInObj.db.dbGuardian.last_ping = new Date()
      checkInObj.db.dbGuardian.last_check_in = new Date()
      checkInObj.db.dbGuardian.check_in_count = 1 + checkInObj.db.dbGuardian.check_in_count
      checkInObj.db.dbCheckIn.request_latency_api = (new Date()).valueOf() - checkInObj.meta.startTime.valueOf()
    } catch (e) {
      return Promise.reject(e)
    }
    return Promise.all([
      checkInObj.db.dbGuardian.save(),
      checkInObj.db.dbCheckIn.save()
    ])
      .then(() => {
        return Promise.all([
          checkInObj.db.dbGuardian.reload({ include: [{ all: true }] }),
          checkInObj.db.dbCheckIn.reload()
        ])
      })
      .then(() => {
        return checkInObj
      })
  },

  recordPing: function (checkInObj) {
    checkInObj.db.dbGuardian.last_ping = new Date()
    return checkInObj.db.dbGuardian.save().then(() => {
      return checkInObj
    })
  }

}

function strArrToJSArr (str, delimA, delimB) {
  if ((str == null) || (str.length === 0)) { return [] }
  try {
    const rtrnArr = []; const arr = str.split(delimA)
    if (arr.length > 0) { for (const i in arr) { rtrnArr.push(arr[i].split(delimB)) } return rtrnArr } else { return [] }
  } catch (e) {
    console.error(e); return []
  }
}

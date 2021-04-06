const Promise = require('bluebird')
const moment = require('moment-timezone')

function extractLabelValues (dbAudioEvents) {
  const arr = []

  dbAudioEvents.forEach(function (item) {
    const value = item.Value.value
    if (arr.indexOf(value) === -1) {
      arr.push(value)
    }
  })

  return arr
}

function countEventsByGuardians (dbAudioEvents) {
  const json = {
    guardians: {}
  }

  for (let i = 0; i < dbAudioEvents.length; i++) {
    const dbRow = dbAudioEvents[i]

    if (!dbRow.audio_guid || !dbRow.guardian_guid) {
      continue
    }

    const dbGuardianGuid = dbRow.guardian_guid

    if (!json.guardians[dbGuardianGuid]) {
      json.guardians[dbGuardianGuid] = {
        guid: dbGuardianGuid,
        shortname: dbRow.guardian_shortname,
        coords: {
          lat: dbRow.shadow_latitude,
          lon: dbRow.shadow_longitude
        },
        events: {}
      }
    }

    const guardian = json.guardians[dbGuardianGuid]
    const value = dbRow.event_value

    if (!guardian.events[value]) {
      guardian.events[value] = 0
    }
    guardian.events[value]++
  }

  return Object.keys(json.guardians).map(function (key) {
    return json.guardians[key]
  })
}

function countEventsByDates (dbAudioEvents) {
  const json = {
    dates: {}
  }

  dbAudioEvents = dbAudioEvents.sort(function (a, b) {
    return new Date(a.begins_at).getTime() > new Date(b.begins_at).getTime()
  })

  dbAudioEvents.forEach(function (event) {
    const dateStr = moment.tz(event.begins_at, event.site_timezone).format('MM/DD/YYYY')

    if (!json.dates[dateStr]) {
      json.dates[dateStr] = {}
    }

    const value = event.event_value
    const dateObj = json.dates[dateStr]

    if (!dateObj[value]) {
      dateObj[value] = 0
    }

    dateObj[value]++
  })

  return json.dates
}

function combineEventViewerUrl (dbRow) {
  const query =
    `guid=${dbRow.guid}&site=${encodeURIComponent(dbRow.site_guid)}&guardian=${encodeURIComponent(dbRow.guardian_shortname)}` +
    `&timestamp=${new Date(dbRow.begins_at).valueOf()}&timezone=${encodeURIComponent(dbRow.site_timezone)}` +
    `&coords=${encodeURIComponent(dbRow.shadow_latitude)},${encodeURIComponent(dbRow.shadow_longitude)}` +
    `&audioGuid=${dbRow.audio_guid}&value=${encodeURIComponent(dbRow.event_value)}` +
    `${dbRow.reviewer_confirmed !== null ? (dbRow.reviewer_confirmed ? '&verification=Confirmed' : '&verification=Denied') : ''}`
  return `${process.env.DASHBOARD_BASE_URL}event?${query}`
}

exports.models = {

  guardianAudioEventsJson: function (req, res, dbAudioEvents) {
    return new Promise(function (resolve, reject) {
      try {
        if (!Array.isArray(dbAudioEvents)) { dbAudioEvents = [dbAudioEvents] }

        const json = {
          events: []
        }

        for (let i = 0; i < dbAudioEvents.length; i++) {
          const dbRow = dbAudioEvents[i]

          json.events.push({
            event_guid: dbRow.guid,
            audio_guid: dbRow.audio_guid,
            meta_url: process.env.ASSET_URLBASE + '/audio/' + dbRow.audio_guid + '.json',
            audio: {
              mp3: process.env.ASSET_URLBASE + '/audio/' + dbRow.audio_guid + '.mp3',
              png: process.env.ASSET_URLBASE + '/audio/' + dbRow.audio_guid + '.png',
              opus: process.env.ASSET_URLBASE + '/audio/' + dbRow.audio_guid + '.opus'
            },
            latitude: dbRow.shadow_latitude,
            longitude: dbRow.shadow_longitude,
            begins_at: dbRow.begins_at,
            ends_at: dbRow.ends_at,
            begins_at_local: dbRow.begins_at_local,
            ends_at_local: dbRow.ends_at_local,
            type: dbRow.event_type,
            value: dbRow.event_value,
            confidence: dbRow.confidence,
            guardian_guid: dbRow.guardian_guid,
            guardian_shortname: dbRow.guardian_shortname,
            site: dbRow.site_guid,
            timezone: dbRow.site_timezone,
            reviewer_confirmed: dbRow.reviewer_confirmed !== null ? !!dbRow.reviewer_confirmed : null,
            reviewer_guid: dbRow.user_guid,
            ai_guid: dbRow.model_guid,
            ai_shortname: dbRow.model_shortname,
            ai_min_conf: dbRow.model_minimal_detection_confidence,
            reason_for_creation: dbRow.reason_for_creation,
            eventViewerUrl: combineEventViewerUrl(dbRow),
            comment: dbRow.comment
          })
        }

        resolve(json)
      } catch (err) {
        reject(err)
      }
    })
  },

  guardianAudioEventsByGuardianJson: function (req, res, dbAudioEvents) {
    return new Promise(function (resolve, reject) {
      try {
        if (!Array.isArray(dbAudioEvents)) { dbAudioEvents = [dbAudioEvents] }

        resolve(countEventsByGuardians(dbAudioEvents))
      } catch (err) {
        reject(err)
      }
    })
  },

  guardianAudioEventsByDatesJson: function (req, res, dbAudioEvents) {
    return new Promise(function (resolve, reject) {
      try {
        if (!Array.isArray(dbAudioEvents)) { dbAudioEvents = [dbAudioEvents] }

        resolve(countEventsByDates(dbAudioEvents))
      } catch (err) {
        reject(err)
      }
    })
  },

  guardianAudioEventsCSV: function (req, res, dbAudioEvents) {
    return new Promise(function (resolve, reject) {
      try {
        if (!Array.isArray(dbAudioEvents)) { dbAudioEvents = [dbAudioEvents] }

        let csv = 'event_guid,audio_guid,meta_url,latitude,longitude,begins_at,ends_at,type,value,confidence,guardian_guid,guardian_shortname,' +
                   'site,reviewer_confirmed,reviewer_guid\r\n'

        for (let i = 0; i < dbAudioEvents.length; i++) {
          const dbRow = dbAudioEvents[i]

          csv += dbRow.guid + ','
          csv += dbRow.audio_guid + ','
          csv += process.env.ASSET_URLBASE + '/audio/' + dbRow.audio_guid + '.json,'
          csv += dbRow.shadow_latitude + ','
          csv += dbRow.shadow_longitude + ','
          csv += dbRow.begins_at.toISOString() + ','
          csv += dbRow.ends_at.toISOString() + ','
          csv += dbRow.event_type + ','
          csv += dbRow.event_value + ','
          csv += dbRow.confidence + ','
          csv += dbRow.guardian_guid + ','
          csv += dbRow.guardian_shortname + ','
          csv += dbRow.site_guid + ','
          csv += dbRow.reviewer_confirmed + ','
          csv += dbRow.user_guid + '\r\n'
        }

        resolve(csv)
      } catch (err) {
        reject(err)
      }
    })
  },

  guardianAudioEventsByGuardianCSV: function (req, res, dbAudioEvents) {
    return new Promise(function (resolve, reject) {
      try {
        if (!Array.isArray(dbAudioEvents)) { dbAudioEvents = [dbAudioEvents] }

        let csv = 'guardian_guid,shortname,latitude,longitude,'

        const labelValues = extractLabelValues(dbAudioEvents)

        labelValues.forEach(function (value) {
          csv += value + ','
        })

        csv = csv.slice(0, -1)
        csv += '\r\n'

        const arr = countEventsByGuardians(dbAudioEvents)

        arr.forEach(function (item) {
          csv += item.guid + ','
          csv += item.shortname + ','
          csv += item.coords.lat + ','
          csv += item.coords.lon + ','

          labelValues.forEach(function (value) {
            csv += (item.events[value] !== undefined ? item.events[value] : 0) + ','
          })

          if (labelValues.length) {
            csv = csv.slice(0, -1)
          }
          csv += '\r\n'
        })

        resolve(csv)
      } catch (err) {
        reject(err)
      }
    })
  },

  guardianAudioEventsByDatesCSV: function (req, res, dbAudioEvents) {
    return new Promise(function (resolve, reject) {
      try {
        if (!Array.isArray(dbAudioEvents)) { dbAudioEvents = [dbAudioEvents] }

        let csv = 'date,'

        const labelValues = extractLabelValues(dbAudioEvents)

        labelValues.forEach(function (value) {
          csv += value + ','
        })

        csv = csv.slice(0, -1)
        csv += '\r\n'

        const json = countEventsByDates(dbAudioEvents)

        for (const key in json) {
          if (json.hasOwnProperty(key)) { // eslint-disable-line no-prototype-builtins
            const item = json[key]

            csv += key + ','

            labelValues.forEach(function (value) {
              csv += (item[value] !== undefined ? item[value] : 0) + ','
            })

            if (labelValues.length) {
              csv = csv.slice(0, -1)
            }
            csv += '\r\n'
          }
        }

        resolve(csv)
      } catch (err) {
        reject(err)
      }
    })
  }

}

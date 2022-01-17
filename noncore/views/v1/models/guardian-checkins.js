const Promise = require('bluebird')
function getAllViews () { return require('..') }

exports.models = {

  guardianCheckIns: function (req, res, dbRows, PARENT_GUID) {
    const views = getAllViews()

    if (!Array.isArray(dbRows)) { dbRows = [dbRows] }

    const jsonArray = []; const jsonRowsByGuid = {}; const dbRowsByGuid = {}

    return new Promise(function (resolve, reject) {
      for (const i in dbRows) {
        const thisRow = dbRows[i]
        let thisGuid = thisRow.guid

        dbRowsByGuid[thisGuid] = thisRow

        jsonRowsByGuid[thisGuid] = {
          guid: thisGuid,
          queued_at: thisRow.queued_at,
          measured_at: thisRow.measured_at,
          received_at: thisRow.created_at,
          is_certified: thisRow.is_certified,
          request_latency: {
            api: thisRow.request_latency_api,
            guardian: thisRow.request_latency_guardian
          },
          location: {
            latitude: parseFloat(thisRow.latitude),
            longitude: parseFloat(thisRow.longitude)
          },
          meta: {}
        }

        if (PARENT_GUID != null) { jsonRowsByGuid[thisGuid].PARENT_GUID = PARENT_GUID }

        if (thisRow.Site != null) { jsonRowsByGuid[thisGuid].site = views.models.guardianSites(req, res, thisRow.Guardian)[0] }
        if (thisRow.Guardian != null) { jsonRowsByGuid[thisGuid].guardian = views.models.guardian(req, res, thisRow.Guardian)[0] }

        if (thisRow.MetaMessages != null) { jsonRowsByGuid[thisGuid].messages = views.models.guardianMetaMessages(req, res, thisRow.MetaMessages) }

        if (thisRow.MetaCPU != null) { jsonRowsByGuid[thisGuid].meta.cpu = views.models.guardianMetaCPU(req, res, thisRow.MetaCPU) }
        if (thisRow.MetaDataTransfer != null) { jsonRowsByGuid[thisGuid].meta.data_transfer = views.models.guardianMetaDataTransfer(req, res, thisRow.MetaDataTransfer) }
        if (thisRow.MetaBattery != null) { jsonRowsByGuid[thisGuid].meta.battery = views.models.guardianMetaBattery(req, res, thisRow.MetaBattery) }
        if (thisRow.MetaLightMeter != null) { jsonRowsByGuid[thisGuid].meta.light_meter = views.models.guardianMetaLightMeter(req, res, thisRow.MetaLightMeter) }
        if (thisRow.MetaNetwork != null) { jsonRowsByGuid[thisGuid].meta.network = views.models.guardianMetaNetwork(req, res, thisRow.MetaNetwork) }
        if (thisRow.MetaOffline != null) { jsonRowsByGuid[thisGuid].meta.offline = views.models.guardianMetaOffline(req, res, thisRow.MetaOffline) }
        if (thisRow.MetaPower != null) { jsonRowsByGuid[thisGuid].meta.power = views.models.guardianMetaPower(req, res, thisRow.MetaPower) }

        try {
          if (thisRow.Audio == null) {
            jsonArray.push(jsonRowsByGuid[thisGuid])
            if (jsonArray.length === dbRows.length) { resolve(jsonArray) }
          } else {
            views.models.guardianAudioJson(thisRow.Audio, thisGuid)
              .then(function (audioJson) {
                thisGuid = audioJson[0].PARENT_GUID
                delete audioJson[0].PARENT_GUID
                jsonRowsByGuid[thisGuid].audio = audioJson[0]

                jsonArray.push(jsonRowsByGuid[thisGuid])
                if (jsonArray.length === dbRows.length) { resolve(jsonArray) }
              })
          }
        } catch (e) {
          reject(e)
        }
      }
    })
  }

}

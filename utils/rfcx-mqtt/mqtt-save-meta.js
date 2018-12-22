var models  = require("../../models");

exports.saveMeta = {

  CPU: function(metaCPU, guardianId, checkInId) {

    var dbMetaCPU = [];

    for (cpuInd in metaCPU) {
      dbMetaCPU.push({
        guardian_id: guardianId,
        check_in_id: checkInId,
        measured_at: new Date(parseInt(metaCPU[cpuInd][0])),
        cpu_percent: parseInt(metaCPU[cpuInd][1]),
        cpu_clock: parseInt(metaCPU[cpuInd][2])
      });
    }

    return models.GuardianMetaCPU.bulkCreate(dbMetaCPU);
  },

  Battery: function(metaBattery, guardianId, checkInId) {

    var dbMetaBattery = [];

    for (battInd in metaBattery) {
      dbMetaBattery.push({
        guardian_id: guardianId,
        check_in_id: checkInId,
        measured_at: new Date(parseInt(metaBattery[battInd][0])),
        battery_percent: parseInt(metaBattery[battInd][1]),
        battery_temperature: parseInt(metaBattery[battInd][2])
      });
    }

    return models.GuardianMetaBattery.bulkCreate(dbMetaBattery);
  },

  Power: function(metaPower, guardianId, checkInId) {

    var dbMetaPower = [];

    for (pwrInd in metaPower) {
      dbMetaPower.push({
        guardian_id: guardianId,
        check_in_id: checkInId,
        measured_at: new Date(parseInt(metaPower[pwrInd][0])),
        is_powered: (metaPower[pwrInd][1] === "1") ? true : false,
        is_charged: (metaPower[pwrInd][2] === "1") ? true : false
      });
    }

    return models.GuardianMetaPower.bulkCreate(dbMetaPower);
  },

  Network: function(metaNetwork, guardianId, checkInId) {

    var dbMetaNetwork = [];

    for (ntwkInd in metaNetwork) {
      dbMetaNetwork.push({
        guardian_id: guardianId,
        check_in_id: checkInId,
        measured_at: new Date(parseInt(metaNetwork[ntwkInd][0])),
        signal_strength: parseInt(metaNetwork[ntwkInd][1]),
        network_type: metaNetwork[ntwkInd][2],
        carrier_name: metaNetwork[ntwkInd][3]
      });
    }

    return models.GuardianMetaNetwork.bulkCreate(dbMetaNetwork);
  },

  DataTransfer: function(metaDataTransfer, guardianId, checkInId) {

    var dbMetaDataTransfer = [];

    for (dtInd in metaDataTransfer) {
      dbMetaDataTransfer.push({
        guardian_id: guardianId,
        check_in_id: checkInId,
        started_at: new Date(parseInt(metaDataTransfer[dtInd][0])),
        ended_at: new Date(parseInt(metaDataTransfer[dtInd][1])),
        bytes_received: parseInt(metaDataTransfer[dtInd][2]),
        bytes_sent: parseInt(metaDataTransfer[dtInd][3]),
        total_bytes_received: parseInt(metaDataTransfer[dtInd][4]),
        total_bytes_sent: parseInt(metaDataTransfer[dtInd][5])
      });
    }

    return models.GuardianMetaDataTransfer.bulkCreate(dbMetaDataTransfer);
  },

  Offline: function(metaOffline, guardianId, checkInId) {

    var dbMetaOffline = [];

    for (offlInd in metaOffline) {
      dbMetaOffline.push({
        guardian_id: guardianId,
        check_in_id: checkInId,
        ended_at: new Date(parseInt(metaOffline[offlInd][0])),
        offline_duration: parseInt(metaOffline[offlInd][1]),
        carrier_name: metaOffline[offlInd][2]
      });
    }

    return models.GuardianMetaOffline.bulkCreate(dbMetaOffline);
  },

  LightMeter: function(metaLightMeter, guardianId, checkInId) {

    var dbMetaLightMeter = [];

    for (lmInd in metaLightMeter) {
      dbMetaLightMeter.push({
        guardian_id: guardianId,
        check_in_id: checkInId,
        measured_at: new Date(parseInt(metaLightMeter[lmInd][0])),
        luminosity: parseInt(metaLightMeter[lmInd][1])
      });
    }

    return models.GuardianMetaLightMeter.bulkCreate(dbMetaLightMeter);
  },

  Accelerometer: function(metaAccelerometer, guardianId, checkInId) {

    var dbMetaAccelerometer = [];

    for (acInd in metaAccelerometer) {
      var xyzVals = metaAccelerometer[acInd][1].split(",");
      dbMetaAccelerometer.push({
        guardian_id: guardianId,
        check_in_id: checkInId,
        measured_at: new Date(parseInt(metaAccelerometer[acInd][0])),
        x: parseFloat(xyzVals[0]),
        y: parseFloat(xyzVals[1]),
        z: parseFloat(xyzVals[2]),
        sample_count: parseInt(metaAccelerometer[acInd][2])
      });
    }

    return models.GuardianMetaAccelerometer.bulkCreate(dbMetaAccelerometer);
  },

  GeoPosition: function(metaPosition, guardianId, checkInId) {

    var dbMetaGeoPosition = [];

    for (locInd in metaPosition) {
      if (metaPosition[locInd][1] != null) {
        var latLng = metaPosition[locInd][1].split(",");
        var accAlt = metaPosition[locInd][2].split(",");
        dbMetaGeoPosition.push({
            guardian_id: guardianId,
            check_in_id: checkInId,
            measured_at: new Date(parseInt(metaPosition[locInd][0])),
            latitude: parseFloat(latLng[0]),
            longitude: parseFloat(latLng[1]),
            accuracy: parseInt(accAlt[0]),
            altitude: parseInt(accAlt[1])
        });
      }
    }

    return models.GuardianMetaGeoPosition.bulkCreate(dbMetaGeoPosition);
  },

  DateTimeOffset: function(metaDateTimeOffset, guardianId, checkInId) {

    var dbMetaDateTimeOffset = [];

    for (dtoInd in metaDateTimeOffset) {
      if (metaDateTimeOffset[dtoInd][2] != null) {
        dbMetaDateTimeOffset.push({
            guardian_id: guardianId,
            check_in_id: checkInId,
            measured_at: new Date(parseInt(metaDateTimeOffset[dtoInd][0])),
            source: metaDateTimeOffset[dtoInd][1],
            system_clock_offset: parseInt(metaDateTimeOffset[dtoInd][2])
        });
      }
    }

    return models.GuardianMetaDateTimeOffset.bulkCreate(dbMetaDateTimeOffset);
  },

  DiskUsage: function(metaDiskUsage, guardianId, checkInId) {

    var diskUsage = { internal: {}, external: {} };
    for (duInd in metaDiskUsage) {
      diskUsage[metaDiskUsage[duInd][0]] = {
        measured_at: new Date(parseInt(metaDiskUsage[duInd][1])),
        used: parseInt(metaDiskUsage[duInd][2]),
        available: parseInt(metaDiskUsage[duInd][3])
      };
    }

    let opts = {
      guardian_id: guardianId,
      check_in_id: checkInId,
      measured_at: diskUsage.internal.measured_at,
      internal_bytes_available: diskUsage.internal.available,
      internal_bytes_used: diskUsage.internal.used,
      external_bytes_available: diskUsage.external.available,
      external_bytes_used: diskUsage.external.used
    };

    return models.GuardianMetaDiskUsage.create(opts);
  },

  PreviousCheckIns: function(previousCheckIns) {
    for (prvChkInInd in previousCheckIns) {
      models.GuardianCheckIn
        .findOne({
          where: { guid: previousCheckIns[prvChkInInd][0] }
        })
        .then((dbPreviousCheckIn) => {
          if (!dbPreviousCheckIn) {
            return Promise.reject(`Couldn't find previous checkin with guid "${previousCheckIns[prvChkInInd][0]}".`)
          }
          dbPreviousCheckIn.request_latency_guardian = previousCheckIns[prvChkInInd][1];
          return dbPreviousCheckIn.save();
        });
    }
  },

  RebootEvents: function(rebootEvents, guardianId, checkInId) {

    var dbMetaRebootEvents = [];

    for (rebootEvntInd in rebootEvents) {
      dbMetaRebootEvents.push({
        guardian_id: guardianId,
        check_in_id: checkInId,
        completed_at: new Date(parseInt(rebootEvents[rebootEvntInd][0]))
      });
    }

    return models.GuardianMetaReboot.bulkCreate(dbMetaRebootEvents);
  },

  SoftwareRoleVersion: function(roleArr, guardianId) {
    var roleVersions = {};
    for (vInd in roleArr) {
      roleVersions[roleArr[vInd][0]] = roleArr[vInd][1];
      models.GuardianSoftware
        .findOne({
          where: { role: roleArr[vInd][0] }
        })
        .then((dbSoftwareRole) => {
          if (!dbSoftwareRole) {
            return Promise.reject(`Role "${roleArr[vInd][0]}" was not found.`);
          }
          return models.GuardianSoftwareVersion
            .findAll({
              where: { software_role_id: dbSoftwareRole.id, version: roleVersions[dbSoftwareRole.role] },
              order: [ ["created_at", "DESC"] ],
              limit: 1
          })
          .then((dbSoftwareRoleVersion) => {
            if (dbSoftwareRoleVersion.length < 1) {
              return Promise.reject(`Software role "${dbSoftwareRole.role}, version "${roleVersions[dbSoftwareRole.role]}" is not [yet] in the database.`)
            } else {
              return models.GuardianMetaSoftwareVersion
                .findOrCreate({
                  where: { guardian_id: guardianId, software_id: dbSoftwareRole.id, version_id: dbSoftwareRoleVersion[0].id }
                })
                .spread((dbMetaSoftware, wasCreated) => {
                  dbMetaSoftware.updated_at = new Date();
                  return dbMetaSoftware.save();
                });
            }
          })
        })
    }
  }

};


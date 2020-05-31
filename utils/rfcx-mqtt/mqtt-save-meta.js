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
        battery_temperature: parseInt(metaBattery[battInd][2]),
        is_charging: (metaBattery[battInd][3] === "1") ? true : ( (metaBattery[battInd][3] === "0") ? false : null ),
        is_fully_charged: (metaBattery[battInd][4] === "1") ? true : ( (metaBattery[battInd][4] === "0") ? false : null )
      });
    }

    return models.GuardianMetaBattery.bulkCreate(dbMetaBattery);
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

  Hardware: function(metaHardware, guardianId) {

      return models.GuardianMetaHardware
        .findOrCreate({
          where: { guardian_id: guardianId }
        })
        .spread((dbMetaHardware, wasCreated) => {

          if (metaHardware.hardware != null) {
            dbMetaHardware.manufacturer = metaHardware.hardware.manufacturer;
            dbMetaHardware.model = metaHardware.hardware.model;
            dbMetaHardware.brand = metaHardware.hardware.brand;
            dbMetaHardware.product = metaHardware.hardware.product;
            dbMetaHardware.android_version = metaHardware.hardware.android;
          }

          if (metaHardware.phone != null) {
            dbMetaHardware.phone_imsi = (metaHardware.phone.imsi != null) ? metaHardware.phone.imsi : null;
            dbMetaHardware.phone_imei = (metaHardware.phone.imei != null) ? metaHardware.phone.imei : null;
            dbMetaHardware.phone_sim_serial = (metaHardware.phone.sim != null) ? metaHardware.phone.sim : null;
            dbMetaHardware.phone_sim_number = (metaHardware.phone.number != null) ? metaHardware.phone.number : null;
            dbMetaHardware.phone_sim_carrier = (metaHardware.phone.carrier != null) ? metaHardware.phone.carrier : null;
          }

          dbMetaHardware.updated_at = new Date();
          return dbMetaHardware.save();

        });

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

  MqttBrokerConnection: function(metaBrokerConnection, guardianId, checkInId) {

    var dbMetaBrokerConnection = [];

    for (brkrInd in metaBrokerConnection) {
      if (metaBrokerConnection[brkrInd][3] != null) {
        dbMetaBrokerConnection.push({
            guardian_id: guardianId,
            check_in_id: checkInId,
            connected_at: new Date(parseInt(metaBrokerConnection[brkrInd][0])),
            connection_latency: parseInt(metaBrokerConnection[brkrInd][1]),
            subscription_latency: parseInt(metaBrokerConnection[brkrInd][2]),
            broker_uri: metaBrokerConnection[brkrInd][3]
        });
      }
    }

    return models.GuardianMetaMqttBrokerConnection.bulkCreate(dbMetaBrokerConnection);
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

  // SentinelPower: function(metaSntnlPwr, guardianId, checkInId) {

  //   var sntnlPwr = { internal: {}, external: {} };
  //   for (duInd in metaSntnlPwr) {
  //     sntnlPwr[metaSntnlPwr[duInd][0]] = {
  //       measured_at: new Date(parseInt(metaSntnlPwr[duInd][1])),
  //       used: parseInt(metaSntnlPwr[duInd][2]),
  //       available: parseInt(metaSntnlPwr[duInd][3])
  //     };
  //   }

  //   let opts = {
  //     guardian_id: guardianId,
  //     check_in_id: checkInId,
  //     measured_at: sntnlPwr.internal.measured_at,
  //     internal_bytes_available: sntnlPwr.internal.available,
  //     internal_bytes_used: sntnlPwr.internal.used,
  //     external_bytes_available: sntnlPwr.external.available,
  //     external_bytes_used: sntnlPwr.external.used
  //   };


  //   var dbMetaBrokerConnection = [];

  //   for (brkrInd in metaBrokerConnection) {
  //     if (metaBrokerConnection[brkrInd][3] != null) {
  //       dbMetaBrokerConnection.push({
  //           guardian_id: guardianId,
  //           check_in_id: checkInId,
  //           connected_at: new Date(parseInt(metaBrokerConnection[brkrInd][0])),
  //           connection_latency: parseInt(metaBrokerConnection[brkrInd][1]),
  //           subscription_latency: parseInt(metaBrokerConnection[brkrInd][2]),
  //           broker_uri: metaBrokerConnection[brkrInd][3]
  //       });
  //     }
  //   }

  //   return models.GuardianMetaMqttBrokerConnection.bulkCreate(dbMetaBrokerConnection);
  // },

  CheckInStatus: function(metaCheckInStatus, guardianId, measuredAt) {

    var dbMetaCheckInStatus = [],
        dbMetaCheckInStatusObj = { guardian_id: guardianId, measured_at: parseInt(measuredAt) };

    for (vInd in metaCheckInStatus) {
      dbMetaCheckInStatusObj[metaCheckInStatus[vInd][0]+"_count"] = parseInt(metaCheckInStatus[vInd][1]);
    }
    dbMetaCheckInStatus.push(dbMetaCheckInStatusObj);

    return models.GuardianMetaCheckInStatus.bulkCreate(dbMetaCheckInStatus);
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
    let proms = [];
    for (vInd in roleArr) {
      roleVersions[roleArr[vInd][0]] = roleArr[vInd][1];
      let prom = models.GuardianSoftware
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
              let opts = { software_role_id: dbSoftwareRole.id, version: roleVersions[dbSoftwareRole.role] };
              return models.GuardianSoftwareVersion
              .findOrCreate({
                where: opts,
                defaults: opts
              })
              .spread((dbSoftwareRoleVersionInsertion, wasCreatedInsertion) => {
                dbSoftwareRoleVersionInsertion.updated_at = new Date();
                return dbSoftwareRoleVersionInsertion.save();
              });
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
        proms.push(prom);
    }
    return Promise.all(proms);
  }

};


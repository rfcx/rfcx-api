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

    models.GuardianMetaCPU
      .bulkCreate(dbMetaCPU).then(function(){ }).catch(function(err){
        console.log("failed to create GuardianMetaCPU | "+err);
      });
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

    models.GuardianMetaBattery
      .bulkCreate(dbMetaBattery).then(function(){ }).catch(function(err){
        console.log("failed to create GuardianMetaBattery | "+err);
      });
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

    models.GuardianMetaPower
      .bulkCreate(dbMetaPower).then(function(){ }).catch(function(err){
        console.log("failed to create GuardianMetaPower | "+err);
      });

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

    models.GuardianMetaNetwork
      .bulkCreate(dbMetaNetwork).then(function(){ }).catch(function(err){
        console.log("failed to create GuardianMetaNetwork | "+err);
      });
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

    models.GuardianMetaDataTransfer
      .bulkCreate(dbMetaDataTransfer).then(function(){ }).catch(function(err){
        console.log("failed to create GuardianMetaDataTransfer | "+err);
      });
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

    models.GuardianMetaOffline
      .bulkCreate(dbMetaOffline).then(function(){ }).catch(function(err){
        console.log("failed to create GuardianMetaOffline | "+err);
      });
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

    models.GuardianMetaLightMeter
      .bulkCreate(dbMetaLightMeter).then(function(){ }).catch(function(err){
        console.log("failed to create GuardianMetaLightMeter | "+err);
      });
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

    models.GuardianMetaAccelerometer
      .bulkCreate(dbMetaAccelerometer).then(function(){ }).catch(function(err){
        console.log("failed to create GuardianMetaAccelerometer | "+err);
      });
  },

  GeoLocation: function(metaLocation, guardianId, checkInId) {

    var dbMetaGeoLocation = [];

    for (locInd in metaLocation) {
      if (metaLocation[locInd][1] != null) {
        dbMetaGeoLocation.push({
            guardian_id: guardianId,
            check_in_id: checkInId,
            measured_at: new Date(parseInt(metaLocation[locInd][0])),
            latitude: parseFloat(metaLocation[locInd][1]),
            longitude: parseFloat(metaLocation[locInd][2]),
            precision: parseFloat(metaLocation[locInd][3])
          });
      }
    }

    models.GuardianMetaGeoLocation
      .bulkCreate(dbMetaGeoLocation).then(function(){ }).catch(function(err){
        console.log("failed to create GuardianMetaGeoLocation | "+err);
      });
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

    models.GuardianMetaDiskUsage.create({
        guardian_id: guardianId,
        check_in_id: checkInId,
        measured_at: diskUsage.internal.measured_at,
        internal_bytes_available: diskUsage.internal.available,
        internal_bytes_used: diskUsage.internal.used,
        external_bytes_available: diskUsage.external.available,
        external_bytes_used: diskUsage.external.used
      }).then(function(dbGuardianMetaDiskUsage){ }).catch(function(err){
        console.log("failed to create GuardianMetaDiskUsage | "+err);
      });
  },

  PreviousCheckIns: function(previousCheckIns) {
    for (prvChkInInd in previousCheckIns) {
      models.GuardianCheckIn
        .findOne({
          where: { guid: previousCheckIns[prvChkInInd][0] }
        }).then(function(dbPreviousCheckIn){
          dbPreviousCheckIn.request_latency_guardian = previousCheckIns[prvChkInInd][1];
          dbPreviousCheckIn.save();
        }).catch(function(err){
          console.log("error finding/updating previous checkin id: "+previousCheckIns[prvChkInInd][0]);
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

    models.GuardianMetaReboot
      .bulkCreate(dbMetaRebootEvents).then(function(){ }).catch(function(err){
        console.log("failed to create GuardianMetaReboot | "+err);
      });
  },

  SoftwareRoleVersion: function(roleArr, guardianId) {
    var roleVersions = {};
    for (vInd in roleArr) { 
      roleVersions[roleArr[vInd][0]] = roleArr[vInd][1];
      models.GuardianSoftware
        .findOne({ 
          where: { role: roleArr[vInd][0] }
      }).then(function(dbSoftwareRole){
        models.GuardianSoftwareVersion
          .findAll({ 
            where: { software_role_id: dbSoftwareRole.id, version: roleVersions[dbSoftwareRole.role] },
            order: [ ["created_at", "DESC"] ],
            limit: 1
        }).then(function(dbSoftwareRoleVersion){
          if (dbSoftwareRoleVersion.length < 1) {
        //    console.log("software role "+dbSoftwareRole.role+", version "+roleVersions[dbSoftwareRole.role]+" is not [yet] in the database.");
          } else {
            models.GuardianMetaSoftwareVersion
              .findOrCreate({
                where: { guardian_id: guardianId, software_id: dbSoftwareRole.id, version_id: dbSoftwareRoleVersion[0].id }
            }).spread(function(dbMetaSoftware, wasCreated){
              dbMetaSoftware.updated_at = new Date();
              dbMetaSoftware.save();
            }).catch(function(err){ console.log(err); });
          }
        }).catch(function(err){ console.log(err); });
      }).catch(function(err){ console.log(err); });
    }
  }

};


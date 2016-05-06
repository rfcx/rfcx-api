var models  = require("../../models");

exports.saveMeta = {

  CPU: function(metaCPU, guardianId, checkInId) {
    for (cpuInd in metaCPU) {
      models.GuardianMetaCPU.create({
          guardian_id: guardianId,
          check_in_id: checkInId,
          measured_at: new Date(parseInt(metaCPU[cpuInd][0])),
          cpu_percent: parseInt(metaCPU[cpuInd][1]),
          cpu_clock: parseInt(metaCPU[cpuInd][2])
        }).then(function(dbGuardianMetaCPU){ }).catch(function(err){
          console.log("failed to create GuardianMetaCPU | "+err);
        });
    }
  },

  Battery: function(metaBattery, guardianId, checkInId) {
    for (battInd in metaBattery) {
      models.GuardianMetaBattery.create({
          guardian_id: guardianId,
          check_in_id: checkInId,
          measured_at: new Date(parseInt(metaBattery[battInd][0])),
          battery_percent: parseInt(metaBattery[battInd][1]),
          battery_temperature: parseInt(metaBattery[battInd][2])
        }).then(function(dbGuardianMetaBattery){ }).catch(function(err){
          console.log("failed to create GuardianMetaBattery | "+err);
        });
    }
  },

  Power: function(metaPower, guardianId, checkInId) {
    for (pwrInd in metaPower) {
      models.GuardianMetaPower.create({
          guardian_id: guardianId,
          check_in_id: checkInId,
          measured_at: new Date(parseInt(metaPower[pwrInd][0])),
          is_powered: (metaPower[pwrInd][1] === "1") ? true : false,
          is_charged: (metaPower[pwrInd][2] === "1") ? true : false
        }).then(function(dbGuardianMetaPower){ }).catch(function(err){
          console.log("failed to create GuardianMetaPower | "+err);
        });
    }
  },

  Network: function(metaNetwork, guardianId, checkInId) {
    for (ntwkInd in metaNetwork) {
      models.GuardianMetaNetwork.create({
          guardian_id: guardianId,
          check_in_id: checkInId,
          measured_at: new Date(parseInt(metaNetwork[ntwkInd][0])),
          signal_strength: parseInt(metaNetwork[ntwkInd][1]),
          network_type: metaNetwork[ntwkInd][2],
          carrier_name: metaNetwork[ntwkInd][3]
        }).then(function(dbGuardianMetaNetwork){ }).catch(function(err){
          console.log("failed to create GuardianMetaNetwork | "+err);
        });
    }
  },

  DataTransfer: function(metaDataTransfer, guardianId, checkInId) {
    for (dtInd in metaDataTransfer) {
      models.GuardianMetaDataTransfer.create({
          guardian_id: guardianId,
          check_in_id: checkInId,
          started_at: new Date(parseInt(metaDataTransfer[dtInd][0])),
          ended_at: new Date(parseInt(metaDataTransfer[dtInd][1])),
          bytes_received: parseInt(metaDataTransfer[dtInd][2]),
          bytes_sent: parseInt(metaDataTransfer[dtInd][3]),
          total_bytes_received: parseInt(metaDataTransfer[dtInd][4]),
          total_bytes_sent: parseInt(metaDataTransfer[dtInd][5])
        }).then(function(dbGuardianMetaDataTransfer){ }).catch(function(err){
          console.log("failed to create GuardianMetaDataTransfer | "+err);
        });
    }
  },

  Offline: function(metaOffline, guardianId, checkInId) {
    for (offlInd in metaOffline) {
      models.GuardianMetaOffline.create({
          guardian_id: guardianId,
          check_in_id: checkInId,
          ended_at: new Date(parseInt(metaOffline[offlInd][0])),
          offline_duration: parseInt(metaOffline[offlInd][1]),
          carrier_name: metaOffline[offlInd][2]
        }).then(function(dbGuardianMetaOffline){ }).catch(function(err){
          console.log("failed to create GuardianMetaOffline | "+err);
        });
    }
  },

  LightMeter: function(metaLightMeter, guardianId, checkInId) {
    for (lmInd in metaLightMeter) {
      models.GuardianMetaLightMeter.create({
          guardian_id: guardianId,
          check_in_id: checkInId,
          measured_at: new Date(parseInt(metaLightMeter[lmInd][0])),
          luminosity: parseInt(metaLightMeter[lmInd][1])
        }).then(function(dbGuardianMetaLightMeter){ }).catch(function(err){
          console.log("failed to create GuardianMetaLightMeter | "+err);
        });
    }
  },

  Accelerometer: function(metaAccelerometer, guardianId, checkInId) {
    for (acInd in metaAccelerometer) {
      var xyzVals = metaAccelerometer[acInd][1].split(",");
      models.GuardianMetaAccelerometer.create({
          guardian_id: guardianId,
          check_in_id: checkInId,
          measured_at: new Date(parseInt(metaAccelerometer[acInd][0])),
          x: parseFloat(xyzVals[0]),
          y: parseFloat(xyzVals[1]),
          z: parseFloat(xyzVals[2]),
          sample_count: parseInt(metaAccelerometer[acInd][2])
        }).then(function(dbGuardianMetaAccelerometer){ }).catch(function(err){
          console.log("failed to create GuardianMetaAccelerometer | "+err);
        });
    }
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
    for (rebootEvntInd in rebootEvents) {
      models.GuardianMetaReboot.create({
          guardian_id: guardianId,
          check_in_id: checkInId,
          completed_at: new Date(parseInt(rebootEvents[rebootEvntInd][0]))
        }).then(function(dbGuardianMetaReboot){ }).catch(function(err){
          console.log("failed to create GuardianMetaReboot | "+err);
        });
    }
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


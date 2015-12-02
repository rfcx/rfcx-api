var util = require("util");
var Promise = require("bluebird");
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
  }

};


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

  }

};


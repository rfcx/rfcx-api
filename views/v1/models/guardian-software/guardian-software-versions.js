var util = require("util");

exports.models = {

  guardianSoftwareVersions: function(req,res,dbSoftwareVersion) {

    if (!util.isArray(dbSoftwareVersion)) { dbSoftwareVersion = [dbSoftwareVersion]; }

    var jsonArray = [];

    for (i in dbSoftwareVersion) {

      var dbRow = dbSoftwareVersion[i];

      // jsonArray.push({
      // });
    }
    return jsonArray;
  
  }

};


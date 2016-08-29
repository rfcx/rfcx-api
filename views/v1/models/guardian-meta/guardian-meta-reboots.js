var util = require("util");

exports.models = {

  guardianMetaReboots: function(req,res,dbReboots,modelInfo) {

    if (!util.isArray(dbReboots)) { dbReboots = [dbReboots]; }

    var jsonArray = [];

    for (i in dbReboots) {

      var dbRow = dbReboots[i];

      jsonArray.push({
        completed_at: dbRow.completed_at
      });
    }
    return jsonArray;
  
  }

};


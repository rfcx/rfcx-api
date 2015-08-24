var util = require("util");

exports.models = {

  guardianSoftware: function(req,res,dbSoftware) {

    if (!util.isArray(dbSoftware)) { dbSoftware = [dbSoftware]; }

    var jsonArray = [];
    
    for (i in dbSoftware) {

      var dbRow = dbSoftware[i];

      var software = {
        role: dbRow.role,
        version: null,
        released: null,
        sha1: null,
        url: null
      };

      if (dbRow.CurrentVersion != null) {
        software.version = dbRow.CurrentVersion.version;
        software.released = dbRow.CurrentVersion.release_date.toISOString();
        software.sha1 = dbRow.CurrentVersion.sha1_checksum;
        software.url = dbRow.CurrentVersion.url;
      }

      jsonArray.push(software);
    }
    return jsonArray;
  
  }

};


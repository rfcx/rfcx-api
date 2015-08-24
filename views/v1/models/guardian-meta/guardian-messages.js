var util = require("util");

exports.models = {

  guardianMessages: function(req,res,dbMessages) {

    if (!util.isArray(dbMessages)) { dbMessages = [dbMessages]; }

    var jsonArray = [];
    
    for (i in dbMessages) {

      var dbRow = dbMessages[i];

      jsonArray.push({
        guid: dbRow.guid,
        received_at: dbRow.received_at,
        sent_at: dbRow.sent_at,
        address: dbRow.address,
        body: dbRow.body
      });
    }
    return jsonArray;
  
  }

};


var util = require("util");

exports.models = {

  audioAnalysisMethods: function(req,res,dbAnalysisMethods) {

    if (!util.isArray(dbAnalysisMethods)) { dbAnalysisMethods = [dbAnalysisMethods]; }

    var jsonArray = [];
    
    for (i in dbAnalysisMethods) {

      var dbRow = dbAnalysisMethods[i];
        
      var jsonRow = {
          name: dbRow.name,
          download_url: dbRow.download_url,
          start_command: dbRow.start_command
        };

      jsonArray.push(jsonRow);

    }
    return jsonArray;
  
  }

};


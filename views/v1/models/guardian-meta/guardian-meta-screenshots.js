var util = require("util");
var aws = require("../../../../utils/external/aws.js").aws();

exports.models = {

  guardianMetaScreenshots: function(req,res,dbScreenshots) {

    if (!util.isArray(dbScreenshots)) { dbScreenshots = [dbScreenshots]; }

    var jsonArray = [];

    for (i in dbScreenshots) {

      var dbRow = dbScreenshots[i];

      jsonArray.push({
        guid: dbRow.guid,
        captured_at: dbRow.captured_at,
        size: dbRow.size,
        sha1_checksum: dbRow.sha1_checksum,
        url: process.env.ASSET_URLBASE+"/screenshots/"+dbRow.guid+".png"
      });
    }
    return jsonArray;
  
  },

  guardianMetaScreenshotFile: function(req,res,dbRows) {
    var dbRow = dbRows/*,
        s3NoProtocol = dbRow.url.substr(dbRow.url.indexOf("://")+3),
        s3Bucket = s3NoProtocol.substr(0,s3NoProtocol.indexOf("/")),
        s3Path = s3NoProtocol.substr(s3NoProtocol.indexOf("/")),
        fileExtension = s3Path.substr(1+s3Path.lastIndexOf("."));*/
        ;

      aws.s3(process.env.ASSET_BUCKET_META).getFile(dbRow.url, function(err, result){
        if(err) { return next(err); }

        // this next line may not be necessary
        result.resume();
        
        var contentLength = parseInt(result.headers["content-length"]);
        
        res.writeHead(  200, {
          "Content-Length": contentLength,
          "Accept-Ranges": "bytes 0-"+(contentLength-1)+"/"+contentLength,
          "Content-Type": result.headers["content-type"],
          "Content-Disposition": "filename="+dbRow.guid+".png"
        });

        result.pipe(res);      
      });
  }

};


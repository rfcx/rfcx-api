var aws = require("../config/aws.js").aws();

exports.views = {

  guardianAudio: function(dbGuardianAudio) {
    
    var aud = dbGuardianAudio;

    return {
      guid: aud.guid,
      measured_at: aud.measured_at,
      analyzed_at: aud.analyzed_at,
      size: aud.size,
      length: aud.length,
      sha1_checksum: aud.sha1_checksum,
      url: "https://api.rfcx.org/v1/audio/"+aud.guid+"."+aud.url.substr(1+aud.url.lastIndexOf(".")),
      guardian: aud.Guardian,
      checkin: aud.CheckIn
    };
  
  },

  guardianAudioFile: function(dbGuardianAudio,res) {

    var aud = dbGuardianAudio,
      s3NoProtocol = aud.url.substr(aud.url.indexOf("://")+3),
      s3Bucket = s3NoProtocol.substr(0,s3NoProtocol.indexOf("/")),
      s3Path = s3NoProtocol.substr(s3NoProtocol.indexOf("/"));

      aws.s3(s3Bucket).getFile(s3Path, function(err, result){
        if(err) { return next(err); }   

        res.setHeader("Content-disposition", "filename="+aud.guid+s3Path.substr(s3Path.lastIndexOf(".")));
        res.setHeader("Content-type", "audio/mp4");

        result.pipe(res);           
      });

  }
  

};


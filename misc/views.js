var aws = require("../config/aws.js").aws();

exports.views = {

  guardian: function(dbGuardian) {
    return {
      guid: dbGuardian.guid
    }
  },

  guardianCheckIn: function(dbGuardianCheckIn) {
    return {
      guid: dbGuardianCheckIn.guid,
      measured_at: dbGuardianCheckIn.measured_at,
      created_at: dbGuardianCheckIn.created_at,
      request_latency: {
        api: dbGuardianCheckIn.request_latency_api,
        guardian: dbGuardianCheckIn.request_latency_guardian,
      },
      location: {
        latitude: parseFloat(dbGuardianCheckIn.latitude),
        longitude: parseFloat(dbGuardianCheckIn.longitude)
      }
    }
  },

  guardianAudio: function(req,res,dbGuardianAudio) {
    
    var aud = dbGuardianAudio;

    return {
      guid: aud.guid,
      measured_at: aud.measured_at,
      analyzed_at: aud.analyzed_at,
      size: aud.size,
      length: aud.length,
      sha1_checksum: aud.sha1_checksum,
      url: process.env.apiUrl+"/v1/audio/"+aud.guid+"."+aud.url.substr(1+aud.url.lastIndexOf(".")),
      guardian: this.guardian(aud.Guardian),
      checkin: this.guardianCheckIn(aud.CheckIn),
      events: []
    };
  
  },

  guardianAudioFile: function(req,res,dbGuardianAudio) {

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


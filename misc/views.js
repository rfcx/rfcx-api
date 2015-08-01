var aws = require("../config/aws.js").aws();

exports.views = {

  guardian: function(req,res,dbGuardian) {
    return {
  //    real_id: dbGuardian.id,
      guid: dbGuardian.guid
    }
  },

  guardianCheckIn: function(req,res,dbCheckIn) {

    var jsonArray = [];
    for (i in dbCheckIn) {
    
      var checkIn = {
        guid: dbCheckIn[i].guid,
        measured_at: dbCheckIn[i].measured_at,
        created_at: dbCheckIn[i].created_at,
        request_latency: {
          api: dbCheckIn[i].request_latency_api,
          guardian: dbCheckIn[i].request_latency_guardian,
        },
        location: {
          latitude: parseFloat(dbCheckIn[i].latitude),
          longitude: parseFloat(dbCheckIn[i].longitude)
        },
        meta: {}
      };

      if (dbCheckIn[i].Guardian != null) { checkIn.guardian = this.guardian(req,res,dbCheckIn[i].Guardian); }
      if (dbCheckIn[i].Audio != null) { checkIn.audio = this.guardianAudio(req,res,dbCheckIn[i].Audio); }
      if (dbCheckIn[i].Messages != null) { checkIn.messages = this.guardianMessages(req,res,dbCheckIn[i].Messages); }

      if (dbCheckIn[i].MetaCPU != null) { checkIn.meta.cpu = this.guardianMetaCPU(req,res,dbCheckIn[i].MetaCPU); }
      if (dbCheckIn[i].MetaDataTransfer != null) { checkIn.meta.data_transfer = this.guardianMetaDataTransfer(req,res,dbCheckIn[i].MetaDataTransfer); }
      if (dbCheckIn[i].MetaBattery != null) { checkIn.meta.battery = this.guardianMetaBattery(req,res,dbCheckIn[i].MetaBattery); }
      if (dbCheckIn[i].MetaLightMeter != null) { checkIn.meta.light_meter = this.guardianMetaLightMeter(req,res,dbCheckIn[i].MetaLightMeter); }
      if (dbCheckIn[i].MetaNetwork != null) { checkIn.meta.network = this.guardianMetaNetwork(req,res,dbCheckIn[i].MetaNetwork); }
      if (dbCheckIn[i].MetaOffline != null) { checkIn.meta.offline = this.guardianMetaOffline(req,res,dbCheckIn[i].MetaOffline); }
      if (dbCheckIn[i].MetaPower != null) { checkIn.meta.power = this.guardianMetaPower(req,res,dbCheckIn[i].MetaPower); }

      jsonArray.push(checkIn);
    }
    return jsonArray;
    
  },

  guardianAudio: function(req,res,dbAudio) {

    var jsonArray = [];
    for (i in dbAudio) {

      var audio = {
        guid: dbAudio[i].guid,
        measured_at: dbAudio[i].measured_at,
        analyzed_at: dbAudio[i].analyzed_at,
        size: dbAudio[i].size,
        length: dbAudio[i].length,
        sha1_checksum: dbAudio[i].sha1_checksum,
        url: req.rfcx.api_url+"/v1/audio/"+dbAudio[i].guid+"."+dbAudio[i].url.substr(1+dbAudio[i].url.lastIndexOf(".")),
//        guardian: this.guardian(req,res,dbAudio[i].Guardian),
//        checkin: ,
        events: []
      };

      if (dbAudio[i].Guardian != null) { audio.guardian = this.guardian(req,res,dbAudio[i].Guardian); }
      if (dbAudio[i].CheckIn != null) { audio.checkin = this.guardianCheckIn(req,res,dbAudio[i].CheckIn); }

      jsonArray.push(audio);
    }
    return jsonArray;
  
  },

  guardianAudioFile: function(req,res,dbAudio) {

    var s3NoProtocol = dbAudio.url.substr(dbAudio.url.indexOf("://")+3),
        s3Bucket = s3NoProtocol.substr(0,s3NoProtocol.indexOf("/")),
        s3Path = s3NoProtocol.substr(s3NoProtocol.indexOf("/"));

      aws.s3(s3Bucket).getFile(s3Path, function(err, result){
        if(err) { return next(err); }   

        res.setHeader("Content-disposition", "filename="+dbAudio.guid+s3Path.substr(s3Path.lastIndexOf(".")));
        res.setHeader("Content-type", "audio/mp4");

        result.pipe(res);           
      });
  },

  guardianMetaCPU: function(req,res,dbCPU) {

    var jsonArray = [];
    for (i in dbCPU) {
      jsonArray.push({
        measured_at: dbCPU[i].measured_at,
        percent_usage: dbCPU[i].cpu_percent,
        clock_speed: dbCPU[i].cpu_clock
      });
    }
    return jsonArray;
  
  },

  guardianMetaDataTransfer: function(req,res,dbDataTransfer) {

    var jsonArray = [];
    for (i in dbDataTransfer) {
      jsonArray.push({
        started_at: dbDataTransfer[i].started_at,
        ended_at: dbDataTransfer[i].ended_at,
        bytes_received: dbDataTransfer[i].bytes_received,
        bytes_sent: dbDataTransfer[i].bytes_sent,
        total_bytes_received: dbDataTransfer[i].total_bytes_received,
        total_bytes_sent: dbDataTransfer[i].total_bytes_sent
      });
    }
    return jsonArray;
  
  },

  guardianMetaBattery: function(req,res,dbBattery) {

    var jsonArray = [];
    for (i in dbBattery) {
      jsonArray.push({
        measured_at: dbBattery[i].measured_at,
        percent_charged: dbBattery[i].battery_percent,
        temperature: dbBattery[i].battery_temperature
      });
    }
    return jsonArray;
  
  },

  guardianMetaLightMeter: function(req,res,dbLightMeter) {

    var jsonArray = [];
    for (i in dbLightMeter) {
      jsonArray.push({
        measured_at: dbLightMeter[i].measured_at,
        luminosity: dbLightMeter[i].luminosity
      });
    }
    return jsonArray;
  
  },

  guardianMetaNetwork: function(req,res,dbNetwork) {

    var jsonArray = [];
    for (i in dbNetwork) {
      jsonArray.push({
        measured_at: dbNetwork[i].measured_at,
        signal_strength: dbNetwork[i].signal_strength,
        carrier_name: dbNetwork[i].carrier_name
      });
    }
    return jsonArray;
  
  },

  guardianMetaOffline: function(req,res,dbOffline) {

    var jsonArray = [];
    for (i in dbOffline) {
      jsonArray.push({
        measured_at: dbOffline[i].measured_at,
        offline_duration: dbOffline[i].offline_duration,
        carrier_name: dbOffline[i].carrier_name
      });
    }
    return jsonArray;
  
  },

  guardianMetaPower: function(req,res,dbPower) {

    var jsonArray = [];
    for (i in dbPower) {
      jsonArray.push({
        measured_at: dbPower[i].measured_at,
        is_powered: dbPower[i].is_powered,
        is_charged: dbPower[i].is_charged
      });
    }
    return jsonArray;
  
  },

  guardianMessages: function(req,res,dbMessages) {

    var jsonArray = [];
    for (i in dbMessages) {
      jsonArray.push({
        guid: dbMessages[i].guid,
        received_at: dbMessages[i].received_at,
        sent_at: dbMessages[i].sent_at,
        number: dbMessages[i].number,
        body: dbMessages[i].body,
        digest: dbMessages[i].digest
      });
    }
    return jsonArray;
  
  }




  

};


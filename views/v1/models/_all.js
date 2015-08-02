var aws = require("../../../config/aws.js").aws();

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
      
      var dbRow = dbCheckIn[i];

      var checkIn = {
        guid: dbRow.guid,
        measured_at: dbRow.measured_at,
        created_at: dbRow.created_at,
        request_latency: {
          api: dbRow.request_latency_api,
          guardian: dbRow.request_latency_guardian,
        },
        location: {
          latitude: parseFloat(dbRow.latitude),
          longitude: parseFloat(dbRow.longitude)
        },
        meta: {}
      };

      if (dbRow.Guardian != null) { checkIn.guardian = this.guardian(req,res,dbRow.Guardian); }
      if (dbRow.Audio != null) { checkIn.audio = this.guardianAudio(req,res,dbRow.Audio); }
      if (dbRow.Messages != null) { checkIn.messages = this.guardianMessages(req,res,dbRow.Messages); }

      if (dbRow.MetaCPU != null) { checkIn.meta.cpu = this.guardianMetaCPU(req,res,dbRow.MetaCPU); }
      if (dbRow.MetaDataTransfer != null) { checkIn.meta.data_transfer = this.guardianMetaDataTransfer(req,res,dbRow.MetaDataTransfer); }
      if (dbRow.MetaBattery != null) { checkIn.meta.battery = this.guardianMetaBattery(req,res,dbRow.MetaBattery); }
      if (dbRow.MetaLightMeter != null) { checkIn.meta.light_meter = this.guardianMetaLightMeter(req,res,dbRow.MetaLightMeter); }      
      if (dbRow.MetaNetwork != null) { checkIn.meta.network = this.guardianMetaNetwork(req,res,dbRow.MetaNetwork); }
      if (dbRow.MetaOffline != null) { checkIn.meta.offline = this.guardianMetaOffline(req,res,dbRow.MetaOffline); }
      if (dbRow.MetaPower != null) { checkIn.meta.power = this.guardianMetaPower(req,res,dbRow.MetaPower); }

      jsonArray.push(checkIn);
    }
    return jsonArray;
    
  },

  guardianAudio: function(req,res,dbAudio) {

    var jsonArray = [];

    for (i in dbAudio) {

      var dbRow = dbAudio[i];

      var audio = {
        guid: dbRow.guid,
        measured_at: dbRow.measured_at,
        analyzed_at: dbRow.analyzed_at,
        size: dbRow.size,
        length: dbRow.length,
        sha1_checksum: dbRow.sha1_checksum,
        url: req.rfcx.api_url+"/v1/audio/"+dbRow.guid+"."+dbRow.url.substr(1+dbRow.url.lastIndexOf(".")),
//        guardian: this.guardian(req,res,dbRow.Guardian),
//        checkin: ,
        events: []
      };

      if (dbRow.Guardian != null) { audio.guardian = this.guardian(req,res,dbRow.Guardian); }
      if (dbRow.CheckIn != null) { audio.checkin = this.guardianCheckIn(req,res,dbRow.CheckIn); }

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

      var dbRow = dbCPU[i];

      jsonArray.push({
        measured_at: dbRow.measured_at,
        percent_usage: dbRow.cpu_percent,
        clock_speed: dbRow.cpu_clock
      });
    }
    return jsonArray;
  
  },

  guardianMetaDataTransfer: function(req,res,dbDataTransfer) {

    var jsonArray = [];

    for (i in dbDataTransfer) {

      var dbRow = dbDataTransfer[i];

      jsonArray.push({
        started_at: dbRow.started_at,
        ended_at: dbRow.ended_at,
        bytes_received: dbRow.bytes_received,
        bytes_sent: dbRow.bytes_sent,
        total_bytes_received: dbRow.total_bytes_received,
        total_bytes_sent: dbRow.total_bytes_sent
      });
    }
    return jsonArray;
  
  },

  guardianMetaBattery: function(req,res,dbBattery) {

    var jsonArray = [];

    for (i in dbBattery) {

      var dbRow = dbBattery[i];

      jsonArray.push({
        measured_at: dbRow.measured_at,
        percent_charged: dbRow.battery_percent,
        temperature: dbRow.battery_temperature
      });
    }
    return jsonArray;
  
  },

  guardianMetaLightMeter: function(req,res,dbLightMeter) {

    var jsonArray = [];

    for (i in dbLightMeter) {

      var dbRow = dbLightMeter[i];

      jsonArray.push({
        measured_at: dbRow.measured_at,
        luminosity: dbRow.luminosity
      });
    }
    return jsonArray;
  
  },

  guardianMetaNetwork: function(req,res,dbNetwork) {

    var jsonArray = [];

    for (i in dbNetwork) {

      var dbRow = dbNetwork[i];

      jsonArray.push({
        measured_at: dbRow.measured_at,
        signal_strength: dbRow.signal_strength,
        carrier_name: dbRow.carrier_name
      });
    }
    return jsonArray;
  
  },

  guardianMetaOffline: function(req,res,dbOffline) {

    var jsonArray = [];

    for (i in dbOffline) {

      var dbRow = dbOffline[i];

      jsonArray.push({
        measured_at: dbRow.measured_at,
        offline_duration: dbRow.offline_duration,
        carrier_name: dbRow.carrier_name
      });
    }
    return jsonArray;
  
  },

  guardianMetaPower: function(req,res,dbPower) {

    var jsonArray = [];

    for (i in dbPower) {

      var dbRow = dbPower[i];

      jsonArray.push({
        measured_at: dbRow.measured_at,
        is_powered: dbRow.is_powered,
        is_charged: dbRow.is_charged
      });
    }
    return jsonArray;
  
  },

  guardianMessages: function(req,res,dbMessages) {

    var jsonArray = [];
    
    for (i in dbMessages) {

      var dbRow = dbMessages[i];

      jsonArray.push({
        guid: dbRow.guid,
        received_at: dbRow.received_at,
        sent_at: dbRow.sent_at,
        number: dbRow.number,
        body: dbRow.body,
        digest: dbRow.digest
      });
    }
    return jsonArray;
  
  }




  

};


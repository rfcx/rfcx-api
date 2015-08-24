var util = require("util");
function loadViews() { return require("../../../views/v1"); }

exports.models = {

  guardianCheckIns: function(req,res,dbCheckIn) {

    var views = loadViews();

    if (!util.isArray(dbCheckIn)) { dbCheckIn = [dbCheckIn]; }

    var jsonArray = [];

    for (i in dbCheckIn) {
      
      var dbRow = dbCheckIn[i];

      var checkIn = {
        guid: dbRow.guid,
        measured_at: dbRow.measured_at,
        created_at: dbRow.created_at,
        is_certified: dbRow.is_certified,
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

      if (dbRow.Guardian != null) { checkIn.guardian = views.models.guardian(req,res,dbRow.Guardian)[0]; }
//      if (dbRow.Version != null) { checkIn.software_version = dbRow.Version.number; }
      if (dbRow.Audio != null) { checkIn.audio = views.models.guardianAudio(req,res,dbRow.Audio); }
      if (dbRow.Messages != null) { checkIn.messages = views.models.guardianMessages(req,res,dbRow.Messages); }

      if (dbRow.MetaCPU != null) { checkIn.meta.cpu = views.models.guardianMetaCPU(req,res,dbRow.MetaCPU); }
      if (dbRow.MetaDataTransfer != null) { checkIn.meta.data_transfer = views.models.guardianMetaDataTransfer(req,res,dbRow.MetaDataTransfer); }
      if (dbRow.MetaBattery != null) { checkIn.meta.battery = views.models.guardianMetaBattery(req,res,dbRow.MetaBattery); }
      if (dbRow.MetaLightMeter != null) { checkIn.meta.light_meter = views.models.guardianMetaLightMeter(req,res,dbRow.MetaLightMeter); }      
      if (dbRow.MetaNetwork != null) { checkIn.meta.network = views.models.guardianMetaNetwork(req,res,dbRow.MetaNetwork); }
      if (dbRow.MetaOffline != null) { checkIn.meta.offline = views.models.guardianMetaOffline(req,res,dbRow.MetaOffline); }
      if (dbRow.MetaPower != null) { checkIn.meta.power = views.models.guardianMetaPower(req,res,dbRow.MetaPower); }

      jsonArray.push(checkIn);
    }
    return jsonArray;
    
  }


};


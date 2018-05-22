var util = require("util");
function getAllViews() { return require("../../../views/v1"); }

exports.models = {

  adoptProtectDonations: function(req,res,dbAdoptProtectDonations) {

    var views = getAllViews();

    if (!util.isArray(dbAdoptProtectDonations)) { dbAdoptProtectDonations = [dbAdoptProtectDonations]; }

    var jsonArray = [];

    for (i in dbAdoptProtectDonations) {

      var dbRow = dbAdoptProtectDonations[i];

      var adoptProtectDonation = {
        guid: dbRow.guid,
        donor_name: dbRow.donor_name,
        donor_email: dbRow.donor_email,
        donated_at: dbRow.donated_at,
        donation_amount: dbRow.donation_amount,
        donation_context: dbRow.donation_context,
        donation_currency: dbRow.donation_currency,
        area_hectares: dbRow.area_hectares,
        area_polygon: dbRow.area_polygon,
        area_site: null,
        area_stream: {
           urls: {
             audio: "/v1/guardians/96a9956ef249/audio.json?order=ascending&limit=3"
           }
        }
      };

      if (dbRow.AreaSite != null) { adoptProtectDonation.area_site = views.models.guardianSites(req,res,dbRow.AreaSite)[0]; }

      jsonArray.push(adoptProtectDonation);
    }
    return jsonArray;

  }


};


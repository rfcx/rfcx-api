exports.models = {

  adoptProtectDonations: function (req, res, dbAdoptProtectDonations) {
    if (!Array.isArray(dbAdoptProtectDonations)) { dbAdoptProtectDonations = [dbAdoptProtectDonations] }

    const jsonArray = []

    for (const i in dbAdoptProtectDonations) {
      const dbRow = dbAdoptProtectDonations[i]

      const adoptProtectDonation = {
        guid: dbRow.guid,
        donor_name: dbRow.donor_name,
        donor_email: dbRow.donor_email,
        donated_at: dbRow.donated_at,
        donation_amount: dbRow.donation_amount,
        donation_context: dbRow.donation_context,
        donation_currency: dbRow.donation_currency,
        area_hectares: dbRow.area_hectares,
        area_polygon: (dbRow.area_polygon == null) ? null : JSON.parse(dbRow.area_polygon),
        area_site: (dbRow.AreaSite == null)
          ? null
          : {
              guid: dbRow.AreaSite.guid,
              name: dbRow.AreaSite.name,
              description: dbRow.AreaSite.description,
              timezone: dbRow.AreaSite.timezone
            },
        area_stream: {
          urls: {
            audio: '/v1/guardians/96a9956ef249/audio.json?order=ascending&limit=3'
          }
        }
      }

      jsonArray.push(adoptProtectDonation)
    }
    return jsonArray
  }

}

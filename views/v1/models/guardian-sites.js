function getAllViews () { return require('../../../views/v1') }

exports.models = {

  guardianSites: function (req, res, dbSites, extended) {
    const views = getAllViews()

    if (!Array.isArray(dbSites)) { dbSites = [dbSites] }

    const jsonArray = []

    for (const i in dbSites) {
      const dbRow = dbSites[i]

      const guardianSite = {
        guid: dbRow.guid,
        name: dbRow.name,
        description: dbRow.description,
        cartodb_map_id: dbRow.cartodb_map_id,
        flickr_photoset_id: dbRow.flickr_photoset_id,
        is_active: dbRow.is_active,
        bounds: dbRow.bounds,
        timezone: dbRow.timezone
      }

      if (extended) {
        guardianSite.map_image_url = dbRow.map_image_url
        guardianSite.globe_icon_url = dbRow.globe_icon_url
        guardianSite.classy_campaign_id = dbRow.classy_campaign_id
        guardianSite.protected_area = dbRow.protected_area
        guardianSite.backstory = dbRow.backstory
      }

      if (dbRow.Guardian != null) { guardianSite.guardians = views.models.guardian(req, res, dbRow.Guardian) }

      jsonArray.push(guardianSite)
    }
    return jsonArray
  }

}

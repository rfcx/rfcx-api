const models = require('../../_models')
const sequelize = require('sequelize')
const Promise = require('bluebird')

function getSiteByGuid (guid, ignoreMissing) {
  return models.GuardianSite
    .findOne({
      where: { guid }
    })
    .then((site) => {
      if (!site && !ignoreMissing) {
        throw new sequelize.EmptyResultError('Site with given guid not found.')
      }
      return site
    })
}

function createSite (data) {
  return models.GuardianSite
    .create(data)
    .then(site => {
      return site.reload({ include: [{ all: true }] })
    })
}

function getSitesByGuids (guids, ignoreMissing) {
  const proms = [];
  (guids || []).forEach((guid) => {
    proms.push(getSiteByGuid(guid, ignoreMissing))
  })
  return Promise.all(proms)
}

function updateSiteAttrs (site, attrs) {
  const allowedAttrs = ['name', 'description', 'timezone', 'bounds', 'map_image_url', 'globe_icon_url', 'classy_campaign_id',
    'protected_area', 'backstory', 'is_active']
  allowedAttrs.forEach((allowedAttr) => {
    if (attrs[allowedAttr] !== undefined) {
      site[allowedAttr] = attrs[allowedAttr]
    }
  })
  return site.save()
    .then(() => {
      return site.reload()
    })
}

function formatSite (site, extended) {
  return new Promise((resolve, reject) => {
    let siteFormatted = {
      guid: site.guid,
      name: site.name,
      description: site.description,
      timezone: site.timezone,
      is_active: site.is_active,
      bounds: site.bounds
    }
    if (extended) {
      siteFormatted = Object.assign(siteFormatted, {
        map_image_url: site.map_image_url,
        globe_icon_url: site.globe_icon_url,
        classy_campaign_id: site.classy_campaign_id,
        protected_area: site.protected_area,
        backstory: site.backstory
      })
    }
    resolve(siteFormatted)
  })
}

module.exports = {
  getSiteByGuid,
  getSitesByGuids,
  updateSiteAttrs,
  formatSite,
  createSite
}

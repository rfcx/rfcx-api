const models = require('../../_models')
const express = require('express')
const router = express.Router()
const views = require('../../views/v1')
const { httpErrorResponse } = require('../../../common/error-handling/http')
const passport = require('passport')
const sequelize = require('sequelize')
const hasRole = require('../../../common/middleware/authorization/authorization').hasRole
const Converter = require('../../../common/converter')
const { ValidationError } = require('../../../common/error-handling/errors')
const { ForbiddenError } = require('../../../common/error-handling/errors')
const userService = require('../../../common/users/users-service-legacy')
const sitesService = require('../../_services/sites/sites-service')
const auth0Service = require('../../../core/_services/auth0/auth0-service')
const kmzService = require('../../_services/kmz/kmz-service')
const Promise = require('bluebird')
const path = require('path')

router.route('/')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), (req, res) => {
    const where = {}
    if (req.query.include_inactive !== 'true') {
      where.is_active = true
    }

    return userService.getAllUserSiteGuids(req.rfcx.auth_token_info.guid)
      .then((guids) => {
        where.guid = {
          [models.Sequelize.Op.in]: guids
        }
        return models.GuardianSite.findAll({
          where,
          limit: req.rfcx.limit,
          offset: req.rfcx.offset
        })
      })
      .then((dbSite) => {
        if (dbSite.length < 1) {
          httpErrorResponse(req, res, 404, 'database')
        } else {
          res.status(200).json(views.models.guardianSites(req, res, dbSite, req.query.extended === 'true'))
        }
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(function (err) {
        console.log('failed to return site | ', err)
        if (err) { res.status(500).json({ msg: 'failed to return site' }) }
      })
  })

router.route('/admin')
  .get(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['guardiansSitesAdmin', 'mobileAppAdmin']), (req, res) => {
    const where = {}
    if (req.query.include_inactive !== 'true') {
      where.is_active = true
    }

    models.GuardianSite
      .findAll({
        where,
        limit: req.rfcx.limit,
        offset: req.rfcx.offset
      })
      .then((dbSite) => {
        if (dbSite.length < 1) {
          httpErrorResponse(req, res, 404, 'database')
        } else {
          res.status(200).json(views.models.guardianSites(req, res, dbSite, req.query.extended === 'true'))
        }
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(function (err) {
        console.log('failed to return site | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return site' }) }
      })
  })

router.route('/statistics/audio')
  .get(passport.authenticate('token', { session: false }), function (req, res) {
    const sql = `SELECT s.guid as guid, s.name as name, s.created_at as created_at, SUM(a.capture_sample_count / f.sample_rate / 3600) as sum
                 FROM GuardianSites s
                 INNER JOIN GuardianAudio a ON a.site_id = s.id
                 INNER JOIN GuardianAudioFormats f ON a.format_id = f.id
                 GROUP BY s.id;`

    models.sequelize
      .query(sql, {
        type: models.sequelize.QueryTypes.Insert
      })
      .spread((data) => {
        res.status(200).json(data)
      })
      .catch(e => httpErrorResponse(req, res, 500, e, "Couldn't get sites statistics."))
  })

router.route('/:site_id')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser', 'systemUser']), function (req, res) {
    return userService.getAllUserSiteGuids(req.rfcx.auth_token_info.guid)
      .then((guids) => {
        const guid = req.params.site_id
        if (req.user && req.user.userType === 'auth0') {
          const userRoles = auth0Service.getUserRolesFromToken(req.user)
          if (!guids.includes(guid) && !auth0Service.hasAnyRoleFromArray(['guardiansSitesAdmin', 'mobileAppAdmin', 'systemUser'], userRoles)) {
            throw new ForbiddenError(`You are not allowed to get info of site with guid ${guid}`)
          }
        }
        return models.GuardianSite.findAll({
          where: { guid: req.params.site_id },
          limit: 1
        })
      })
      .then((dbSite) => {
        if (dbSite.length < 1) {
          httpErrorResponse(req, res, 404, 'database')
        } else {
          res.status(200).json(views.models.guardianSites(req, res, dbSite, req.query.extended === 'true'))
        }
      })
      .catch(ForbiddenError, e => { httpErrorResponse(req, res, 403, null, e.message) })
      .catch((err) => {
        console.log('failed to return site | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return site' }) }
      })
  })

router.route('/kmz')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['guardiansSitesAdmin']), function (req, res) {
    const bounds = {
      type: '',
      coordinates: []
    }
    const allowedExtensions = ['.kmz', '.kml']
    const file = req.files.file
    if (!file) {
      return httpErrorResponse(req, res, 400, null, 'No file provided.')
    }
    const extension = path.extname(file.originalname)
    if (!allowedExtensions.includes(extension)) {
      return httpErrorResponse(req, res, 400, null, `Wrong file type. Allowed types are: ${allowedExtensions.join(', ')}`)
    }
    const filePath = req.files.file.path
    const isKML = (extension === '.kml')
    return kmzService.toGeoJSON(filePath, isKML)
      .then((data) => {
        if ((data.features.length === 1) && (data.features[0].geometry.type === 'Point')) {
          const msg = 'Wrong format of bounds. It should be as Polygon or MultiPolygon types'
          throw new Error(msg)
        } else if (data.features.length && data.features.length === 1 && (data.features[0].geometry.coordinates.length !== 3)) {
          data.features.forEach((item) => {
            const coord = item.geometry.coordinates[0].map((arr) => {
              return arr.splice(0, arr.length - 1)
            })
            bounds.coordinates = coord
          })
          bounds.type = 'Polygon'
        } else {
          data.features.forEach((item) => {
            if (item.geometry.type !== 'Point') {
              // for Polygon in MultiPolygon
              let coord
              if (item.geometry.type === 'Polygon') {
                coord = item.geometry.coordinates[0].map((arr) => {
                  return arr.splice(0, arr.length - 1)
                })
              } else {
                // for LineString in MultiPolygon
                if (item.geometry.type === 'LineString') {
                  coord = item.geometry.coordinates.map((arr) => {
                    return arr.splice(0, arr.length - 1)
                  })
                }
              }
              bounds.coordinates.push(coord)
            } else {
              // for Point in MultiPolygon
              return Promise.resolve()
            }
          })
          bounds.type = 'MultiPolygon'
        }
      })
      .then(() => { res.status(200).json(bounds) })
      .catch(e => { console.log(e); httpErrorResponse(req, res, 500, e, e.message || 'File couldn\'t be uploaded.') })
  })

router.route('/:guid')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['guardiansSitesAdmin']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('name').optional().toString()
    params.convert('description').optional().toString()
    params.convert('timezone').optional().toString()
    params.convert('bounds').optional()
    params.convert('map_image_url').optional().toString()
    params.convert('globe_icon_url').optional().toString()
    params.convert('classy_campaign_id').optional().toString()
    params.convert('protected_area').optional().toNonNegativeInt()
    params.convert('backstory').optional().toString()
    params.convert('is_active').optional().toBoolean()

    params.validate()
      .then(() => {
        return sitesService.getSiteByGuid(req.params.guid)
      })
      .then((site) => {
        return sitesService.updateSiteAttrs(site, transformedParams)
      })
      .then((site) => {
        return sitesService.formatSite(site, true)
      })
      .then(result => res.status(200).json(result))
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => httpErrorResponse(req, res, 500, e, e.message || 'Could not update the site.'))
  })

router.route('/:site_id/bounds')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['guardiansSitesAdmin']), function (req, res) {
    models.GuardianSite
      .findOne({
        where: { guid: req.params.site_id }
      })
      .then(function (dbSite) {
        if (!dbSite) {
          httpErrorResponse(req, res, 404, 'database')
        } else {
          dbSite.bounds = {
            type: req.body.type,
            coordinates: req.body.coordinates
          }
          return dbSite.save()
        }
      })
      .then(function (dbSite) {
        res.status(200).json(views.models.guardianSites(req, res, dbSite))
      })
      .catch(function (err) {
        console.log('Error updating site bounds. Check params please | ' + err)
        if (err) { res.status(500).json({ msg: 'Error updating site bounds. Check params please.' }) }
      })
  })

router.route('/')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['guardiansSitesAdmin']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('guid').toString()
    params.convert('name').toString()
    params.convert('description').optional().toString()
    params.convert('timezone').toString().isValidTimezone()
    params.convert('bounds').optional()
    params.convert('map_image_url').optional().toString()
    params.convert('globe_icon_url').optional().toString()
    params.convert('classy_campaign_id').optional().toString()
    params.convert('protected_area').optional().toNonNegativeInt()
    params.convert('backstory').optional().toString()
    params.convert('is_active').optional().toBoolean()
    params.convert('cartodb_map_id').optional().toString()
    params.convert('flickr_photoset_id').optional().toString()
    params.convert('timezone_offset').optional().toInt()

    params.validate()
      .then(() => {
        return sitesService.createSite(transformedParams)
      })
      .then((site) => {
        res.status(200).json(site)
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch((err) => {
        res.status(500).json({ err })
      })
  })

module.exports = router

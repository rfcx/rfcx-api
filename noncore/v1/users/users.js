/* eslint-disable camelcase */
const express = require('express')
const router = express.Router()
const { httpErrorResponse } = require('../../../common/error-handling/http')
const passport = require('passport')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)
const { ValidationError } = require('../../../common/error-handling/errors')
const { ForbiddenError } = require('../../../common/error-handling/errors')
const usersService = require('../../../common/users')
const auth0Service = require('../../../common/auth0')
const sequelize = require('sequelize')
const hasRole = require('../../../common/middleware/authorization/authorization').hasRole
const Converter = require('../../../common/converter')
const path = require('path')
const fileUtil = require('../../_utils/misc/file')

// this request does nothing in terms of response, but it's created to check if user from jwt
// exist in our database, and if not, create it
router.route('/touchapi')
  .get(passport.authenticate(['jwt'], { session: false }), async function (req, res) {
    res.status(200).json({ success: true })
  })

/* eslint-disable camelcase */
router.route('/accept-terms')
  .post(passport.authenticate(['jwt'], { session: false }), function (req, res) {
    const app = req.body.app || ''

    return auth0Service.getToken()
      .then((token) => {
        const user_metadata = {
          consentGivenRangerApp: 'true',
          consentGivenDashboard: 'true',
          consentGivenAcousticsExplorer: 'true'
        }
        user_metadata[`consentGiven${app}`] = 'true'
        return auth0Service.updateAuth0User(token, {
          user_id: req.rfcx.auth_token_info.sub,
          user_metadata
        })
      })
      .then(() => {
        res.status(200).json({ success: true })
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => httpErrorResponse(req, res, 500, e, 'Unable to save user acceptance.'))
  })

router.route('/auth0/create-user')
  .post(passport.authenticate(['jwt'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('email').toString()
    params.convert('guid').optional().toString()
    params.convert('password').optional().toString()
    params.convert('firstname').toString()
    params.convert('lastname').toString()

    params.validate()
      .then(() => {
        return auth0Service.createAuth0User(transformedParams)
      })
      .then(([body, statusCode]) => {
        res.status(200).json(body)
      })
      .catch((err) => {
        res.status(500).json({ err })
      })
  })

router.route('/auth0/update-user/public')
  .post(passport.authenticate(['token', 'jwt'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('user_id').toString()
    params.convert('given_name').optional().toString()
    params.convert('family_name').optional().toString()
    params.convert('subscription_email').optional().toString()
    params.convert('name').optional().toString()
    params.convert('nickname').optional().toString()
    params.convert('picture').optional().toString()

    let token, body

    params.validate()
      .then(() => {
        return auth0Service.getToken()
      })
      .then((data) => {
        token = data
        if (!transformedParams.name && transformedParams.given_name && transformedParams.family_name) {
          transformedParams.name = `${transformedParams.given_name} ${transformedParams.family_name}`
        }
        return auth0Service.updateAuth0User(token, transformedParams)
      })
      .then((body) => {
        if (body.user_metadata) {
          const opts = {}
          opts.user_metadata = {}
          opts.user_id = transformedParams.user_id
          if (body.user_metadata.given_name) {
            opts.user_metadata.given_name = transformedParams.given_name
          }
          if (body.user_metadata.family_name) {
            opts.user_metadata.family_name = transformedParams.family_name
          }
          if (opts.user_metadata.given_name && opts.user_metadata.family_name) {
            opts.user_metadata.name = `${opts.user_metadata.given_name} ${opts.user_metadata.family_name}`
          } else if (opts.user_metadata.given_name && !opts.user_metadata.family_name) {
            opts.user_metadata.name = `${opts.user_metadata.given_name}`
          } else if (!opts.user_metadata.given_name && opts.user_metadata.family_name) {
            opts.user_metadata.name = `${opts.user_metadata.family_name}`
          }
          return auth0Service.updateAuth0User(token, opts)
        }
        return body
      })
      .then((data) => {
        body = data
        const email = body.email || req.user.email
        return usersService.getUserByEmail(email, true)
      })
      .then((user) => {
        if (user) {
          const opts = {}
          if (transformedParams.given_name) {
            opts.firstname = transformedParams.given_name
          }
          if (transformedParams.family_name) {
            opts.lastname = transformedParams.family_name
          }
          if (transformedParams.subscription_email) {
            opts.subscription_email = transformedParams.subscription_email
          }
          if (opts.firstname || opts.lastname || opts.subscription_email) {
            return usersService.update(user, opts)
          }
          return true
        }
        return true
      })
      .then((data) => {
        res.status(200).json(body)
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch((err) => {
        console.error('/auth0/update-user/public error', err)
        res.status(500).json({ err })
      })
  })

// Endpoint for standard user to change his/her password

router.route('/password-change')
  .post(passport.authenticate(['jwt'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    let user_id // eslint-disable-line camelcase
    try {
      user_id = req.rfcx.auth_token_info.sub // eslint-disable-line camelcase
    } catch (e) {
      return httpErrorResponse(req, res, 403, null, 'Unable to change password for your account.')
    }

    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)
    params.convert('password').toString()

    params.validate()
      .then(() => {
        return auth0Service.getToken()
      })
      .then((data) => {
        return auth0Service.updateAuth0UserPassword(data, { user_id }, transformedParams.password)
      })
      .then(() => {
        res.status(200).json({ success: true })
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ValidationError, e => { httpErrorResponse(req, res, 400, null, e.message) })
      .catch((err) => { res.status(500).json({ err }) })
  })

router.route('/avatar-change')
  .post(passport.authenticate(['jwt'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    let user; let user_id; let email; let guid; let files = req.files // eslint-disable-line camelcase
    try {
      user_id = req.rfcx.auth_token_info.sub // eslint-disable-line camelcase
      email = req.rfcx.auth_token_info.email
      guid = req.rfcx.auth_token_info.guid
    } catch (e) {
      return httpErrorResponse(req, res, 403, null, 'Unable to change avatar for your account.')
    }
    return auth0Service.checkUserConnection(user_id, 'auth0')
      .then(() => {
        return usersService.checkUserPicture(req.files)
      })
      .then(() => {
        return usersService.getUserByGuidOrEmail(guid, email)
      })
      .then((dbUser) => {
        user = dbUser
        if (user && user.picture) {
          return usersService.deleteImageFile(user.picture, guid)
        }
        return true
      })
      .then(() => {
        const opts = {
          filePath: req.files[0].path,
          fileName: `/userpics/${guid}${path.extname(req.files[0].originalname)}`,
          bucket: process.env.USERS_BUCKET,
          acl: 'public-read'
        }
        return usersService.uploadImageFile(opts)
      })
      .then(() => {
        const url = `https://${process.env.USERS_BUCKET}.s3-${process.env.AWS_REGION_ID}.amazonaws.com/userpics/${guid}${path.extname(req.files[0].originalname)}`
        return usersService.prepareUserUrlPicture(user, url)
          .then(() => {
            return url
          })
      })
      .then((url) => {
        return auth0Service.getToken()
          .then((token) => {
            return auth0Service.updateAuth0User(token, {
              user_id,
              picture: url
            })
              .then(() => {
                return url
              })
          })
      })
      .then((url) => {
        user = null
        user_id = null // eslint-disable-line camelcase
        email = null
        guid = null
        res.status(200).json({ url })
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ForbiddenError, e => { httpErrorResponse(req, res, 403, null, e.message) })
      .catch(ValidationError, e => { httpErrorResponse(req, res, 400, null, e.message) })
      .catch((err) => { res.status(500).json({ err }) })
      .finally(() => {
        fileUtil.removeReqFiles(files)
        files = null
      })
  })

router.route('/auth0/users')
  .get(passport.authenticate(['jwt'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.query, transformedParams)

    params.convert('per_page').optional().toInt()
    params.convert('page').optional().toInt()
    params.convert('include_totals').optional().toBoolean()
    params.convert('sort').optional().toString()
    params.convert('fields').optional().toString()
    params.convert('include_fields').optional().toBoolean()
    params.convert('q').optional().toString()

    params.validate()
      .then(() => {
        return auth0Service.getToken()
      })
      .then((token) => {
        return auth0Service.getUsers(token, transformedParams)
      })
      .then((body) => {
        res.status(200).json(body)
      })
      .catch((err) => {
        console.error('v1/users/auth0/users error', err)
        res.status(500).json({ err })
      })
  })

router.route('/auth0/roles')
  .get(passport.authenticate(['jwt'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
    auth0Service.getAuthToken()
      .then((token) => {
        return auth0Service.getAllRoles(token)
      })
      .then((body) => {
        res.status(200).json(body)
      })
      .catch((err) => {
        res.status(500).json({ err })
      })
  })

router.route('/auth0/clients')
  .get(passport.authenticate(['jwt'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
    auth0Service.getToken()
      .then((token) => {
        return auth0Service.getAllClients(token)
      })
      .then((body) => {
        res.status(200).json(body)
      })
      .catch((err) => {
        res.status(500).json({ err })
      })
  })

router.route('/auth0/:user_guid/roles')
  .post(passport.authenticate(['jwt'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('roles').toArray()

    params.validate()
      .then(() => {
        return auth0Service.getAuthToken()
      })
      .then((token) => {
        return auth0Service.assignRolesToUser(token, req.params.user_guid, transformedParams.roles)
      })
      .then((body) => {
        res.status(200).json(body)
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch((err) => {
        res.status(500).json({ err })
      })
  })

router.route('/auth0/:user_guid/roles')
  .delete(passport.authenticate(['jwt'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.query, transformedParams)

    params.convert('roles').toArray()

    params.validate()
      .then(() => {
        return auth0Service.getAuthToken()
      })
      .then((token) => {
        return auth0Service.deleteRolesFromUser(token, req.params.user_guid, transformedParams.roles)
      })
      .then((body) => {
        res.status(200).json(body)
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch((err) => {
        res.status(500).json({ err })
      })
  })

router.route('/auth0/:user_guid/roles')
  .get(passport.authenticate(['jwt'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
    auth0Service.getAuthToken()
      .then((token) => {
        return auth0Service.getUserRoles(token, req.params.user_guid)
      })
      .then((body) => {
        res.status(200).json(body)
      })
      .catch((err) => {
        res.status(500).json({ err })
      })
  })

router.route('/auth0/send-change-password-email')
  .post(passport.authenticate(['jwt'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('email').toString()

    params.validate()
      .then(() => {
        return auth0Service.sendChangePasswordEmail(req.body.email)
      })
      .then((body) => {
        res.status(200).json({ result: body })
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch((err) => {
        res.status(500).json({ err })
      })
  })

router.route('/:id/info')
  .get(passport.authenticate(['token', 'jwt'], { session: false }), hasRole(['rfcxUser', 'usersAdmin']), function (req, res) {
    usersService.getUserByGuidOrEmail(req.params.id)
      .then((user) => {
        return usersService.formatUser(user)
      })
      .then((data) => {
        res.status(200).json(data)
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => { console.error('e', e); httpErrorResponse(req, res, 500, e, "Couldn't get user info.") })
  })

router.route('/info')
  .get(passport.authenticate(['token', 'jwt'], { session: false }), hasRole(['rfcxUser', 'usersAdmin']), function (req, res) {
    usersService.getUserByGuidOrEmail(req.query.guid, req.query.email)
      .then((user) => {
        return usersService.formatUser(user)
      })
      .then((data) => {
        res.status(200).json(data)
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => { console.error('e', e); httpErrorResponse(req, res, 500, e, "Couldn't get user info.") })
  })

module.exports = router

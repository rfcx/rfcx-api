const models = require('../../_models')
const express = require('express')
const router = express.Router()
const random = require('../../../common/crypto/random')
const views = require('../../views/v1')
const { httpErrorResponse } = require('../../../common/error-handling/http')
const passport = require('passport')
const requireUser = require('../../../common/middleware/authorization/authorization').requireTokenType('user')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)
const mailService = require('../../_services/mail/mail-service')
const { ValidationError } = require('../../../common/error-handling/errors')
const { ForbiddenError } = require('../../../common/error-handling/errors')
const usersService = require('../../../common/users/users-service-legacy')
const auth0Service = require('../../../common/auth0/auth0-service')
const sequelize = require('sequelize')
const ApiConverter = require('../../_utils/api-converter')
const hasRole = require('../../../common/middleware/authorization/authorization').hasRole
const Converter = require('../../../common/converter')
const path = require('path')
const fileUtil = require('../../_utils/misc/file')

// this request does nothing in terms of response, but it's created to check if user from jwt
// exist in our database, and if not, create it
router.route('/touchapi')
  .get(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), async function (req, res) {
    res.status(200).json({ success: true })
  })

router.route('/accept-terms')
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), function (req, res) {
    const app = req.body.app || ''

    return auth0Service.getToken()
      .then((token) => {
        const user_metadata = { // eslint-disable-line camelcase
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

router.route('/delete')
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('guid').toString()
    params.convert('user_id').toString()

    params.validate()
      .then(() => {
        // there might be cases when user exists in Auth0 but doesn't exist in MySQL
        if (transformedParams.guid === '') {
          return true
        }
        return usersService.getUserByGuid(transformedParams.guid, true)
      })
      .then(() => {
        if (transformedParams.guid === '') {
          return true
        }
        return usersService.removeUserByGuidFromMySQL({ guid: transformedParams.guid })
      })
      .then(() => {
        return auth0Service.getToken()
      })
      .then((token) => {
        return auth0Service.deleteAuth0User(token, transformedParams.user_id)
      })
      .then(() => {
        res.status(200).json({ success: true })
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch((err) => {
        res.status(500).json({ err })
      })
  })

router.route('/create')
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('email').toString()
    params.convert('subscription_email').optional().toString()
    params.convert('guid').toString()
    params.convert('password').optional().toString()
    params.convert('firstname').toString()
    params.convert('lastname').toString()
    params.convert('rfcx_system').optional().toBoolean()

    params.validate()
      .then(() => {
        return usersService.findOrCreateUser({
          guid: transformedParams.guid,
          email: transformedParams.email,
          subscription_email: transformedParams.subscription_email || null,
          firstname: transformedParams.firstname,
          lastname: transformedParams.lastname,
          rfcx_system: transformedParams.rfcx_system === true,
          password: transformedParams.password || null
        })
      })
      .then((user) => {
        res.status(200).json(user)
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch((err) => {
        res.status(500).json({ err })
      })
  })

router.route('/auth0/create-user')
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('email').toString()
    params.convert('guid').optional().toString()
    params.convert('password').optional().toString()
    params.convert('firstname').toString()
    params.convert('lastname').toString()

    params.validate()
      .then(() => {
        return auth0Service.getToken()
      })
      .then((token) => {
        return auth0Service.createAuth0User(token, transformedParams)
      })
      .then((body) => {
        res.status(200).json(body)
      })
      .catch((err) => {
        res.status(500).json({ err })
      })
  })

router.route('/auth0/update-user')
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('user_id').toString()
    params.convert('defaultSite').optional().toString()
    params.convert('accessibleSites').optional().toArray()

    params.validate()
      .then(() => {
        return auth0Service.getToken()
      })
      .then((token) => {
        return auth0Service.updateAuth0User(token, transformedParams)
      })
      .then((body) => {
        res.status(200).json(body)
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch((err) => {
        res.status(500).json({ err })
      })
  })

router.route('/auth0/update-user/public')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
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
            return usersService.updateUserAtts(user, opts)
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

router.route('/auth0/users/export-link')
  .get(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.query, transformedParams)

    params.convert('connection_id').optional().toString()
    params.convert('limit').optional().toString()
    params.convert('fields').optional().toArray()

    let token

    params.validate()
      .then(() => {
        return auth0Service.getToken()
      })
      .then((data) => {
        token = data
        // use for getting all users by connections with database
        return auth0Service.getAllUsersForExports(token, transformedParams)
      })
      .then((data) => {
        // use for uploading csv or json file with sorting users by fields
        return auth0Service.getAjob(token, data)
      })
      .then((data) => {
        console.info('data for uploading users', data)
        res.status(200).json(data)
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch((err) => {
        console.error('\nerror\n', err)
        res.status(500).json({ err })
      })
  })

router.route('/auth0/update-users')
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('users').toArray()

    params.validate()
      .then(() => {
        return auth0Service.getToken()
      })
      .then((token) => {
        const proms = []
        if (transformedParams.users) {
          transformedParams.users.forEach((user) => {
            if (user.given_name && user.family_name) {
              return true
            } else {
              const opts = {
                user_id: user.user_id,
                given_name: user.given_name,
                family_name: user.family_name,
                name: user.name
              }
              proms.push(auth0Service.updateAuth0User(token, opts))
            }
          })
        }
        return Promise.all(proms)
      })
      .then((data) => {
        console.info('data', data)
        res.status(200).json(data)
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch((err) => {
        console.error('\nerror\n', err)
        res.status(500).json({ err })
      })
  })

router.route('/reset-user-password')
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('guid').toString()
    params.convert('user_id').toString()
    params.convert('email').toString()

    let token, password

    params.validate()
      .then(() => {
        return auth0Service.getToken()
      })
      .then((data) => {
        token = data
        password = random.randomString(50)
        return usersService.updateMySQLUserPassword(password, transformedParams.email, transformedParams.guid)
      })
      .then(() => {
        return auth0Service.updateAuth0UserPassword(token, transformedParams, password)
      })
      .then((user) => {
        return mailService.sendTextMail({
          email_address: transformedParams.email,
          recipient_name: user.firstname || 'RFCx User',
          subject: 'Password has been reset',
          message: 'Your password has been reset by administrator. You can set new password at https://dashboard.rfcx.org/login'
        })
      })
      .then((body) => {
        res.status(200).json(body)
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch((err) => {
        res.status(500).json({ err })
      })
  })

// Endpoint for admins to change other user password

router.route('/change-user-password')
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('guid').toString()
    params.convert('user_id').toString()
    params.convert('email').toString()
    params.convert('password').toString()

    let token

    params.validate()
      .then(() => {
        return auth0Service.getToken()
      })
      .then((data) => {
        token = data
        return usersService.updateMySQLUserPassword(transformedParams.password, transformedParams.email, transformedParams.guid)
      })
      .then(() => {
        return auth0Service.updateAuth0UserPassword(token, transformedParams, transformedParams.password)
      })
      .then((data) => {
        res.status(200).json({ success: true })
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch((err) => {
        res.status(500).json({ err })
      })
  })

// Endpoint for standard user to change his/her password

router.route('/password-change')
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    let user_id, email, guid // eslint-disable-line camelcase
    try {
      user_id = req.rfcx.auth_token_info.sub // eslint-disable-line camelcase
      email = req.rfcx.auth_token_info.email
      guid = req.rfcx.auth_token_info.guid
    } catch (e) {
      return httpErrorResponse(req, res, 403, null, 'Unable to change password for your account.')
    }
    let token

    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)
    params.convert('password').toString()

    params.validate()
      .then(() => {
        return auth0Service.getToken()
      })
      .then((data) => {
        token = data
        return usersService.updateMySQLUserPassword(transformedParams.password, email, guid)
      })
      .then(() => {
        return auth0Service.updateAuth0UserPassword(token, { user_id }, transformedParams.password)
      })
      .then((data) => {
        token = null
        res.status(200).json({ success: true })
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ValidationError, e => { httpErrorResponse(req, res, 400, null, e.message) })
      .catch((err) => { res.status(500).json({ err }) })
  })

router.route('/avatar-change')
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    let user; let user_id; let email; let guid; let files = req.files // eslint-disable-line camelcase
    try {
      user_id = req.rfcx.auth_token_info.sub // eslint-disable-line camelcase
      email = req.rfcx.auth_token_info.email
      guid = req.rfcx.auth_token_info.guid
    } catch (e) {
      return httpErrorResponse(req, res, 403, null, 'Unable to change avatar for your account.')
    }
    return usersService.checkUserConnection(user_id, 'auth0')
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
          filePath: req.files.file.path,
          fileName: `/userpics/${guid}${path.extname(req.files.file.originalname)}`,
          bucket: process.env.USERS_BUCKET,
          acl: 'public-read'
        }
        return usersService.uploadImageFile(opts)
      })
      .then(() => {
        const url = `https://${process.env.USERS_BUCKET}.s3-${process.env.AWS_REGION_ID}.amazonaws.com/userpics/${guid}${path.extname(req.files.file.originalname)}`
        return usersService.prepareUserUrlPicture(user, url)
          .then(() => {
            return url
          })
      })
      .then((url) => {
        return auth0Service.getToken()
          .then((token) => {
            return auth0Service.updateAuth0User(token, {
              user_id: user_id,
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
  .get(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
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
  .get(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
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
  .get(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
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
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
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
  .delete(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
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
  .get(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
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
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('email').toString()

    params.validate()
      .then(() => {
        return auth0Service.getToken()
      })
      .then((token) => {
        return auth0Service.sendChangePasswordEmail(token, req.body.email)
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
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser', 'usersAdmin']), function (req, res) {
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
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser', 'usersAdmin']), function (req, res) {
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

// TO DO security measure to ensure that not any user can see any other user
router.route('/:user_id')
  .get(passport.authenticate('token', { session: false }), function (req, res) {
    models.User
      .findAll({
        where: { guid: req.params.user_id },
        limit: 1
      }).then(function (dbUser) {
        if (dbUser.length < 1) {
          httpErrorResponse(req, res, 404, 'database')
        } else {
          res.status(200).json(views.models.users(req, res, dbUser))
        }

        return null
      }).catch(function (err) {
        console.error('failed to return user | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return user' }) }
      })
  })

router.route('/:guid/sites')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser', 'usersAdmin']), function (req, res) {
    const converter = new ApiConverter('user', req)
    const serviceParams = {
      sites: req.body.sites
    }

    usersService.getUserByGuid(req.params.guid)
      .then((user) => {
        return usersService.updateSiteRelations(user, serviceParams)
      })
      .then((user) => {
        const data = converter.cloneSequelizeToApi({
          user: user
        })
        data.links.self += req.params.guid + '/sites'
        res.status(200).json(data)
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => { console.error('e', e); httpErrorResponse(req, res, 500, e, "Couldn't update user-sites relations.") })
  })

// TO DO security measure to ensure that not any user can see any other user
router.route('/:user_id')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
    const converter = new ApiConverter('user', req)
    // This must be replaced with AWS user roles
    // if (req.rfcx.auth_token_info.guid === req.params.user_id) {
    models.User
      .findOne({
        where: { guid: req.params.user_id }
      }).then(function (dbUser) {
        if (!dbUser) {
          httpErrorResponse(req, res, 404, 'database')
        } else {
          // now let's update the user info....
          return usersService.updateUserInfo(dbUser, req.body)
        }
      })
      .then(function (user) {
        const data = converter.cloneSequelizeToApi({
          user: user
        })
        data.links.self += req.params.user_id
        res.status(200).json(data)
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(function (err) {
        console.error('failed to update user | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to update user' }) }
      })
    // } else {
    // res.status(401).json({msg:"not allowed to edit another user's profile"});
    // }
  })

router.route('/')
  .get(passport.authenticate('token', { session: false }), requireUser, function (req, res) {
    const converter = new ApiConverter('user', req)

    usersService
      .getAllUsers()
      .then(usersService.formatUsers)
      .then((users) => {
        const data = converter.cloneSequelizeToApi({
          users: users
        })
        res.status(200).json(data)
      })
      .catch(e => httpErrorResponse(req, res, 500, e, 'Failed to return users.'))
  })

module.exports = router

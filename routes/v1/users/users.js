const models = require('../../../models')
const express = require('express')
const router = express.Router()
const hash = require('../../../utils/misc/hash.js').hash
const token = require('../../../utils/internal-rfcx/token.js').token
const views = require('../../../views/v1')
const httpError = require('../../../utils/http-errors.js')
const passport = require('passport')
const moment = require('moment')
const requireUser = require('../../../middleware/authorization/authorization').requireTokenType('user')
passport.use(require('../../../middleware/passport-token').TokenStrategy)
const executeService = require('../../../services/execute-service')
const mailService = require('../../../services/mail/mail-service')
const ValidationError = require('../../../utils/converter/validation-error')
const ForbiddenError = require('../../../utils/converter/forbidden-error')
const usersService = require('../../../services/users/users-service-legacy')
const sitesService = require('../../../services/sites/sites-service')
const auth0Service = require('../../../services/auth0/auth0-service')
const tokensService = require('../../../services/tokens/tokens-service')
const sequelize = require('sequelize')
const ApiConverter = require('../../../utils/api-converter')
const hasRole = require('../../../middleware/authorization/authorization').hasRole
const Converter = require('../../../utils/converter/converter')
const path = require('path')
const fileUtil = require('../../../utils/misc/file')

function removeExpiredResetPasswordTokens () {
  models.ResetPasswordToken
    .destroy({
      where: { expires_at: { [models.Sequelize.Op.lt]: new Date() } }
    })
    .then(function (count) {
      if (count) {
        console.log('Deleted ' + count + ' expired "reset password" token(s)')
      }
      return null
    })
    .catch(function (err) {
      console.log(err)
    })
}

router.route('/login')
  .post(function (req, res) {
    const userInput = {
      email: (req.body.email != null) ? req.body.email.toLowerCase() : null,
      pswd: req.body.password
    }

    let loginExpirationInMinutes = 1440 // 1 day (24 hours)
    if ((req.body.extended_expiration != null) && (parseInt(req.body.extended_expiration) === 1)) {
      loginExpirationInMinutes = 5760 // 4 days
    }

    models.User
      .findOne({
        where: { email: userInput.email }
      }).then(function (dbUser) {
        if (dbUser === null) {
          return res.status(401).json({
            message: 'invalid email or password', error: { status: 401 }
          })
        } else {
          if (dbUser.rfcx_system !== undefined && dbUser.rfcx_system === false) {
            return res.status(403).json({
              message: 'You don\'t have required permissions', error: { status: 403 }
            })
          }

          if (dbUser.auth_password_hash !== hash.hashedCredentials(dbUser.auth_password_salt, userInput.pswd)) {
            return res.status(401).json({
              message: 'invalid email or password', error: { status: 401 }
            })
          }

          dbUser.last_login_at = new Date()
          dbUser.save()

          return token.createUserToken({
            token_type: 'login',
            created_by: req.rfcx.url_path,
            reference_tag: dbUser.guid,
            owner_primary_key: dbUser.id,
            minutes_until_expiration: loginExpirationInMinutes
          }).then(function (tokenInfo) {
            dbUser.VisibleToken = {
              token: tokenInfo.token,
              token_expires_at: tokenInfo.token_expires_at
            }

            return res.status(200).json(views.models.users(req, res, dbUser))
          }).catch(function (err) {
            console.log(err)
            res.status(500).json({
              message: err.message, error: { status: 500 }
            })
          })
        }
      }).catch(function (err) {
        console.log(err)
        res.status(500).json({
          message: err.message, error: { status: 500 }
        })
      })
  })

router.route('/logout')
  .post(passport.authenticate('token', { session: false }), function (req, res) {
    return usersService.getUserByGuid(req.rfcx.auth_token_info.guid)
      .then(tokensService.removeUserTokens)
      .then((tokensCount) => {
        res.status(200).json({
          tokens_removed: tokensCount
        })
      })
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(e => httpError(req, res, 500, e, 'Error in process of logout.'))
  })

router.route('/request-access/app')
  .post(function (req, res) {
    const serviceRequest = {
      email_address: req.body.email_address,
      os: req.body.os
    }
    executeService(req, res, serviceRequest, mailService.registerToAppWaitingList, 'Failed to subscribe')
  })

router.route('/register')
  .post(passport.authenticate('token', { session: false }), function (req, res) {
    const userInput = {
      type: ((req.body.type == null) ? 'unspecified' : req.body.type.toLowerCase()),
      firstname: req.body.firstname || '',
      lastname: req.body.lastname || '',
      email: req.body.email.toLowerCase(),
      pswd: req.body.password
    }
    const loginExpirationInMinutes = 1440

    models.User
      .findOrCreate({
        where: { email: userInput.email }
      }).spread(function (dbUser, wasCreated) {
        if (!wasCreated) {
          res.status(409).json({
            message: 'A user with such username or email already exists', error: { status: 409 }
          })
        } else {
          dbUser.rfcx_system = true
          dbUser.type = userInput.type
          dbUser.firstname = userInput.firstname
          dbUser.lastname = userInput.lastname

          const passwordSalt = hash.randomHash(320)
          dbUser.auth_password_salt = passwordSalt
          dbUser.auth_password_hash = hash.hashedCredentials(passwordSalt, userInput.pswd)
          dbUser.auth_password_updated_at = new Date()
          dbUser.save()

          token.createUserToken({
            token_type: 'registration',
            created_by: req.rfcx.url_path,
            reference_tag: dbUser.guid,
            owner_primary_key: dbUser.id,
            minutes_until_expiration: loginExpirationInMinutes
          }).then(function (tokenInfo) {
            dbUser.VisibleToken = {
              token: tokenInfo.token,
              token_expires_at: tokenInfo.token_expires_at
            }

            res.status(200).json(views.models.users(req, res, dbUser))
          }).catch(function (err) {
            console.log(err)
            res.status(500).json({
              message: err.message, error: { status: 500 }
            })
          })
        }
      }).catch(function (err) {
        console.log(err)
        res.status(500).json({
          message: err.message, error: { status: 500 }
        })
      })
  })

router.route('/send-reset-password-link')
  .post(function (req, res) {
    let dbUser, dbToken
    // first of all, check if user with requested e-mail exists
    models.User
      .findOne({
        where: { email: req.body.email }
      })
      .then(function (user) {
        // if doesn't exists, simply do nothing
        // don't tell a client that e-mail doesn't exist in terms of security
        // this will prevent us from brute-force users by e-mails
        // Also don't allow to reset password for users which are not RFCx user (e.g. auth0 users)
        if (!user || user.rfcx_system === false) {
          res.status(200).json({})
          return Promise.reject() // eslint-disable-line prefer-promise-reject-errors
        } else {
          dbUser = user
          // create reset password token for founded user which will expire in 1 day
          return models.ResetPasswordToken
            .create({
              user_id: user.id,
              expires_at: moment().add(1, 'day')
            })
        }
      })
      .then(function (token) {
        dbToken = token
        // send an email to user with link to change password
        const url = process.env.CONSOLE_BASE_URL + 'reset-password?token=' + dbToken.guid
        const text = 'To reset your RFCx account password click the following link: ' + url +
                   ' If you didn\'t request a password change, you can ignore this message.'
        return mailService.sendTextMail({
          email_address: req.body.email,
          recipient_name: dbUser.firstname || 'RFCx User',
          subject: 'Password reset',
          message: text
        })
      })
      .then(function (mailServiceRes) {
        // return success to client with the time of token expiration
        res.status(200).json({
          expires_at: dbToken.expires_at
        })
      })
      .catch(function (err) {
        if (err) {
          console.log(err)
          httpError(req, res, 500, 'database')
        }
      })
  })

router.route('/reset-password')
  .post(function (req, res) {
    let dbToken
    // find reset password token by specified guid
    models.ResetPasswordToken
      .findOne({
        where: { guid: req.body.token }
      })
      .then(function (token) {
        if (!token) {
          // if user specified not existing token, then show a message and cancel password reset
          httpError(req, res, 404, null, 'Such token doesn\'t exist. It might be expired or invalid.')
          return Promise.reject() // eslint-disable-line prefer-promise-reject-errors
        }
        dbToken = token
        // if token is expired, then show this message to user and cancel password reset. Destroy this token.
        if (new Date(dbToken.expires_at) < new Date()) {
          dbToken.destroy()
          httpError(req, res, 400, null, 'Your token has expired. Please start reset password process once again.')
          return Promise.reject() // eslint-disable-line prefer-promise-reject-errors
        } else {
          // if everything is ok, then find user by specified in token id
          return models.User
            .findOne({
              where: { id: dbToken.user_id }
            })
        }
      })
      .then(function (dbUser) {
        // if user was not found, then token has invalid user data. Destroy this token.
        // Also do the same if user is not RFCx user (e.g. auth0 user)
        if (!dbUser || dbUser.rfcx_system === false) {
          dbToken.destroy()
          httpError(req, res, 400, null, 'Invalid token. Please start reset password process once again.')
          return Promise.reject() // eslint-disable-line prefer-promise-reject-errors
        }
        // encrypt user's new password and save it
        const passwordSalt = hash.randomHash(320)
        dbUser.auth_password_salt = passwordSalt
        dbUser.auth_password_hash = hash.hashedCredentials(passwordSalt, req.body.password)
        dbUser.auth_password_updated_at = new Date()
        return dbUser.save()
      })
      .then(function (dbUser) {
        // token doesn't need anymore, destroy it
        dbToken.destroy()
        // and check for other tokens being expired
        removeExpiredResetPasswordTokens()
        return mailService.sendTextMail({
          email_address: dbUser.email,
          recipient_name: dbUser.firstname || 'RFCx User',
          subject: 'Password changed',
          message: 'Your password has been changed. If you didn\'t make any changes, please contact us: contact@rfcx.org'
        })
      })
      .then(function () {
        res.status(200).json({})
      })
      .catch(function (err) {
        if (err) {
          console.log(err)
          httpError(req, res, 500, 'database')
        }
      })
  })

// Legacy endpoint to change password in MySQL

router.route('/change-password')
  .post(passport.authenticate('token', { session: false }), requireUser, function (req, res) {
    if (!req.body.guid) {
      return httpError(req, res, 400, null, 'You need to specify user guid in request payload.')
    }
    if (!req.body.password) {
      return httpError(req, res, 400, null, 'You need to specify current password in request payload.')
    }
    if (!req.body.newPassword) {
      return httpError(req, res, 400, null, 'You need to specify new password in request payload.')
    }
    // user must be logged in with his account to change the password
    if (req.body.guid !== req.rfcx.auth_token_info.guid) {
      return httpError(req, res, 403, null, 'You are not allowed to change stranger\'s password.')
    }
    models.User
      .findOne({
        where: { guid: req.body.guid }
      })
      .then(function (dbUser) {
        if (!dbUser) {
          httpError(req, res, 404, null, 'User with specified guid not found.')
          return Promise.reject() // eslint-disable-line prefer-promise-reject-errors
        }
        if (dbUser.rfcx_system !== undefined && dbUser.rfcx_system === false) {
          httpError(req, res, 403, null, 'You don\'t have required permissions.')
          return Promise.reject() // eslint-disable-line prefer-promise-reject-errors
        }
        if (dbUser.auth_password_hash !== hash.hashedCredentials(dbUser.auth_password_salt, req.body.password)) {
          httpError(req, res, 403, null, 'Password is incorrect.')
          return Promise.reject() // eslint-disable-line prefer-promise-reject-errors
        }
        const passwordSalt = hash.randomHash(320)
        dbUser.auth_password_salt = passwordSalt
        dbUser.auth_password_hash = hash.hashedCredentials(passwordSalt, req.body.newPassword)
        dbUser.auth_password_updated_at = new Date()
        return dbUser.save()
      })
      .then(function (dbUser) {
        return mailService.sendTextMail({
          email_address: dbUser.email,
          recipient_name: dbUser.firstname || 'RFCx User',
          subject: 'Password changed',
          message: 'Your password has been changed. If you didn\'t make any changes, please contact us: contact@rfcx.org'
        })
      })
      .then(function () {
        res.status(200).json({})
        return true
      })
      .catch(function (err) {
        if (err) {
          console.log(err)
          httpError(req, res, 500, 'database')
        }
      })
  })

router.route('/checkin')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['appUser', 'rfcxUser']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)
    const singleMode = req.body.locations === undefined

    if (singleMode) {
      params.convert('latitude').toFloat()
      params.convert('longitude').toFloat()
      params.convert('time').toString()
    } else {
      params.convert('locations').toArray()
    }

    params.validate()
      .then(() => {
        return usersService.getUserByGuid(req.rfcx.auth_token_info.guid)
      })
      .then((user) => {
        const locations = singleMode ? [transformedParams] : transformedParams.locations
        locations.forEach((item) => {
          item.user_id = user.id
        })
        return usersService.createUserLocations(locations)
      })
      .then(result => res.status(200).json(result))
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => httpError(req, res, 500, e, e.message || 'Checkin couldn\'t be created. Please check input params.'))
  })

router.route('/locations')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), (req, res) => {
    return usersService.getLocations(req)
      .then(result => res.status(200).json(result))
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => httpError(req, res, 500, e, e.message || 'Cannot get users locations'))
  })

router.route('/lastcheckin')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    usersService.getAllUsers()
      .then(users => {
        const proms = []
        users.forEach(function (user) {
          const prom = usersService.getUserLastCheckin(user)
          proms.push(prom)
        }, this)
        return Promise.all(proms)
      })
      .then(checkins => {
        // filter out empty results
        checkins = checkins.filter((checkin) => {
          return checkin.length
        })
        // format data
        checkins = checkins.map(checkin => {
          return usersService.formatCheckin(checkin[0])
        })
        return checkins
      })
      .then(data => {
        res.status(200).json(data)
      })
  })

// this request does nothing in terms of response, but it's created to check if user from jwt
// exist in our database, and if not, create it
router.route('/touchapi')
  .get(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), async function (req, res) {
    res.status(200).json({ success: true })
  })

router.route('/code')
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)
    const roles = ['rfcxUser']

    params.convert('code').toString().toLowerCase()
    params.convert('accept_terms').optional().toBoolean()
    params.convert('app').optional().toString().default('')

    let user, userId, authToken, token

    params.validate()
      .then(() => {
        return usersService.getUserByGuid(req.rfcx.auth_token_info.guid)
      })
      .then((data) => {
        user = data
        userId = req.rfcx.auth_token_info.sub || req.rfcx.auth_token_info.guid
        return sitesService.getSiteByGuid(transformedParams.code)
      })
      .then(() => {
        return auth0Service.getAuthToken()
      })
      .then((token) => {
        authToken = token
        return auth0Service.getToken()
      })
      .then((t) => {
        token = t
        return auth0Service.getAllRolesByLabels(authToken, roles)
      })
      .then((roles) => {
        const rolesGuids = roles.map((role) => {
          return role._id
        })
        return auth0Service.assignRolesToUser(authToken, userId, rolesGuids)
      })
      .then(() => {
        const attrs = {
          user_id: userId,
          defaultSite: transformedParams.code,
          accessibleSites: [transformedParams.code]
        }
        if (transformedParams.accept_terms) {
          const user_metadata = {} // eslint-disable-line camelcase
          user_metadata[`consentGiven${transformedParams.app}`] = 'true'
          attrs.user_metadata = user_metadata // eslint-disable-line camelcase
        }
        return auth0Service.updateAuth0User(token, attrs)
      })
      .then(() => {
        return usersService.updateSiteRelations(user, { sites: [transformedParams.code] })
      })
      .then(() => {
        return usersService.updateDefaultSite(user, transformedParams.code)
      })
      .then(() => {
        res.status(200).json({ success: true })
        const userName = (user.firstname && user.lastname) ? `${user.firstname} ${user.lastname}` : 'No name user'
        mailService.sendMessage({
          from_name: 'RFCx Users Management',
          email: 'contact@rfcx.org',
          subject: 'User has got access',
          html: `<b>${userName}</b> has got access to <b>${transformedParams.code}</b> site with <b>${roles.join(', ')}</b> role. </br>User guid <b>${user.guid}</b>, user email ${user.email}`
        })
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { console.log('\n\n', e, '\n\n'); httpError(req, res, 500, e, 'Invalid code.') })
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
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => httpError(req, res, 500, e, 'Unable to save user acceptance.'))
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
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
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
        return usersService.findOrCreateUser(
          {
            [models.Sequelize.Op.or]: {
              guid: transformedParams.guid,
              email: transformedParams.email
            }
          },
          {
            guid: transformedParams.guid,
            email: transformedParams.email,
            subscription_email: transformedParams.subscription_email || null,
            firstname: transformedParams.firstname,
            lastname: transformedParams.lastname,
            rfcx_system: transformedParams.rfcx_system === true,
            password: transformedParams.password || null
          }
        )
      })
      .spread((user, created) => {
        res.status(200).json(user)
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
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
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
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
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
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
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
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
        console.log('data for uploading users', data)
        res.status(200).json(data)
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch((err) => {
        console.log('\nerror\n', err)
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
        console.log('data', data)
        res.status(200).json(data)
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch((err) => {
        console.log('\nerror\n', err)
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
        password = hash.randomString(50)
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
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
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
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
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
      return httpError(req, res, 403, null, 'Unable to change password for your account.')
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
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => { httpError(req, res, 400, null, e.message) })
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
      return httpError(req, res, 403, null, 'Unable to change avatar for your account.')
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
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
      .catch(ValidationError, e => { httpError(req, res, 400, null, e.message) })
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
        console.log('v1/users/auth0/users error', err)
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
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
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
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
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
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
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
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { console.log('e', e); httpError(req, res, 500, e, "Couldn't get user info.") })
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
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { console.log('e', e); httpError(req, res, 500, e, "Couldn't get user info.") })
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
          httpError(req, res, 404, 'database')
        } else {
          res.status(200).json(views.models.users(req, res, dbUser))
        }

        return null
      }).catch(function (err) {
        console.log('failed to return user | ' + err)
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
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { console.log('e', e); httpError(req, res, 500, e, "Couldn't update user-sites relations.") })
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
          httpError(req, res, 404, 'database')
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
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(function (err) {
        console.log('failed to update user | ' + err)
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
      .catch(e => httpError(req, res, 500, e, 'Failed to return users.'))
  })

module.exports = router

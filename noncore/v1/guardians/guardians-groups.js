const express = require('express')
const router = express.Router()
const { httpErrorResponse } = require('../../../common/error-handling/http')
const ValidationError = require('../../../utils/converter/validation-error')
const guardianGroupService = require('../../_services/guardians/guardian-group-service')
const auth0Service = require('../../../core/_services/auth0/auth0-service')
const usersService = require('../../../common/users/users-service-legacy')
const hasRole = require('../../../common/middleware/authorization/authorization').hasRole
const sequelize = require('sequelize')
const Converter = require('../../../utils/converter/converter')
const Promise = require('bluebird')
const hash = require('../../../utils/misc/hash')
const passport = require('passport')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)

// returns guardian groups bases on accessibleSites user attribute
router.route('/groups')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    const params = {
      extended: true
    }
    if (req.rfcx.auth_token_info) {
      try {
        params.sites = req.rfcx.auth_token_info['https://rfcx.org/app_metadata'].accessibleSites || []
      } catch (e) {
        params.sites = []
      }
    }

    guardianGroupService
      .getGroups(params)
      .then((dbGroups) => {
        return guardianGroupService.formatGroups(dbGroups, true)
      })
      .then((data) => { res.status(200).json(data) })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => httpErrorResponse(req, res, 500, e, e.message || 'Could not get GuardianGroups.'))
  })

router.route('/groups/admin')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['guardiansSitesAdmin']), function (req, res) {
    guardianGroupService
      .getAllGroups(true)
      .then((dbGroups) => {
        return guardianGroupService.formatGroups(dbGroups, true)
      })
      .then((data) => { res.status(200).json(data) })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => httpErrorResponse(req, res, 500, e, e.message || 'Could not get GuardianGroups.'))
  })

router.route('/group/:shortname')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser', 'guardiansSitesAdmin']), (req, res) => {
    guardianGroupService
      .getGroupByShortname(req.params.shortname)
      .then((dbGroup) => {
        return guardianGroupService.formatGroup(dbGroup, true)
      })
      .then((data) => { res.status(200).json(data) })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(sequelize.EmptyResultError, e => { httpErrorResponse(req, res, 404, null, e.message) })
      .catch(e => httpErrorResponse(req, res, 500, e, e.message || 'Could not get GuardianGroup with given shortname.'))
  })

router.route('/groups/subscribe')
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), (req, res) => {
    let userId, email, guid
    try {
      userId = req.rfcx.auth_token_info.sub
      email = req.rfcx.auth_token_info.email
      guid = req.rfcx.auth_token_info.guid
    } catch (e) {
      return httpErrorResponse(req, res, 403, null, 'Unable to change subscription for user. Invalid authorization data.')
    }

    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('groups').toArray()
    params.convert('subscription_email').optional().toString()

    params.validate()
      .then(() => {
        return usersService.getUserByGuidOrEmail(guid, email)
      })
      .then((dbUser) => {
        if (transformedParams.subscription_email) {
          return auth0Service.getToken()
            .then((token) => {
              return auth0Service.updateAuth0User(token, {
                user_id: userId,
                subscription_email: transformedParams.subscription_email
              })
            })
            .then(() => {
              return usersService.updateUserAtts(dbUser, { subscription_email: transformedParams.subscription_email })
            })
            .then(() => {
              return Promise.resolve(dbUser)
            })
        } else {
          return Promise.resolve(dbUser)
        }
      })
      .then((dbUser) => {
        return usersService.subscribeUserToGroups(dbUser, transformedParams.groups)
      })
      .then(() => { res.status(200).json({ success: true }) })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(sequelize.EmptyResultError, e => { httpErrorResponse(req, res, 404, null, e.message) })
      .catch(e => httpErrorResponse(req, res, 500, e, e.message || 'Could not subscribe user to groups.'))
  })

router.route('/groups/unsubscribe')
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), (req, res) => {
    let email, guid
    try {
      email = req.rfcx.auth_token_info.email
      guid = req.rfcx.auth_token_info.guid
    } catch (e) {
      return httpErrorResponse(req, res, 403, null, 'Unable to change subscription for user. Invalid authorization data.')
    }

    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('groups').toArray()

    params.validate()
      .then(() => {
        return usersService.getUserByGuidOrEmail(guid, email)
      })
      .then((dbUser) => {
        return usersService.unsubscribeUserFromGroups(dbUser, transformedParams.groups)
      })
      .then(() => { res.status(200).json({ success: true }) })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(sequelize.EmptyResultError, e => { httpErrorResponse(req, res, 404, null, e.message) })
      .catch(e => httpErrorResponse(req, res, 500, e, e.message || 'Could not unsubscribe user from groups.'))
  })

router.route('/groups/unsubscribe/public')
  .get((req, res) => {
    const transformedParams = {}
    const params = new Converter(req.query, transformedParams)

    params.convert('groups').toArray()
    params.convert('email').toString()
    params.convert('token').toString()

    params.validate()
      .then(() => {
        if (transformedParams.token !== hash.hashedCredentials(usersService.unsubscriptionSalt, transformedParams.email)) {
          throw new Error('Wrong token provided.')
        }
        return usersService.getUserBySubscriptionEmail(transformedParams.email)
      })
      .then((dbUser) => {
        return usersService.unsubscribeUserFromGroups(dbUser, transformedParams.groups, true)
      })
      .then(() => {
        res
          .type('text/html')
          .status(200)
          .send('<p>You were successfully unsubscribed.</p>')
      })
      .catch((e) => {
        res
          .type('text/html')
          .status(400)
          .send('<p>Error occured during request. Please contact <a href="mailto:contact@rfcx.org">contact@rfcx.org</a></p>')
      })
  })

router.route('/group')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['guardiansSitesAdmin']), (req, res) => {
    guardianGroupService
      .createGroup(req.body)
      .then((dbGroup) => {
        return guardianGroupService.formatGroup(dbGroup, true)
      })
      .then((data) => { res.status(200).json(data) })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => httpErrorResponse(req, res, 500, e, e.message || 'Could not create GuardianGroup with given params.'))
  })

router.route('/group/:shortname')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['guardiansSitesAdmin']), (req, res) => {
    guardianGroupService
      .updateGroup(req.params.shortname, req.body)
      .then((dbGroup) => {
        return guardianGroupService.formatGroup(dbGroup, true)
      })
      .then((data) => { res.status(200).json(data) })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => httpErrorResponse(req, res, 500, e, e.message || 'Could not update GuardianGroup with given params.'))
  })

router.route('/group/:shortname')
  .delete(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['guardiansSitesAdmin']), (req, res) => {
    guardianGroupService
      .deleteGroupByShortname(req.params.shortname)
      .then(() => { res.status(200).json({ success: true }) })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => httpErrorResponse(req, res, 500, e, e.message || 'Could not update GuardianGroup with given params.'))
  })

module.exports = router

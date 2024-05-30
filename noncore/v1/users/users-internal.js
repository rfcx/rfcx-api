const express = require('express')
const router = express.Router()
const { httpErrorResponse } = require('../../../common/error-handling/http')
const passport = require('passport')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)
const { ValidationError } = require('../../../common/error-handling/errors')
const auth0Service = require('../../../common/auth0')
const hasRole = require('../../../common/middleware/authorization/authorization').hasRole
const Converter = require('../../../common/converter')

router.route('/auth0/export-link')
  .get(passport.authenticate(['jwt'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.query, transformedParams)

    params.convert('connection_id').optional().toString()
    params.convert('limit').optional().toString()
    params.convert('fields').optional().toArray()

    params.validate()
      .then(() => {
        return auth0Service.getToken()
      })
      .bind({})
      .then((token) => {
        this.token = token
        console.info('\ntransformedParams\n', transformedParams)
        console.info('\ntoken\n', this.token)
        // use for getting all users by connections with database
        return auth0Service.getAllUsersForExports(token, transformedParams)
      })
      .then((data) => {
        // use for uploading csv or json file with sorting users by fields
        console.info('\njob_ID\n', data)
        return auth0Service.getAjob(this.token, data)
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

router.route('/auth0/fix-users-names')
  .post(passport.authenticate(['jwt'], { session: false }), hasRole(['usersAdmin']), function (req, res) {
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
            if (!user.given_name && !user.family_name) {
              return true
            } else {
              const opts = {
                user_id: user.user_id,
                given_name: user.given_name,
                family_name: user.family_name,
                name: user.name
              }
              console.info('\ntransformedParams\n', opts)
              proms.push(auth0Service.updateAuth0User(token, opts))
            }
          })
        }
        return Promise.all(proms)
      })
      .then((users) => {
        console.info('users', users)
        res.status(200).json(users)
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch((err) => {
        console.error('\nerror\n', err)
        res.status(500).json({ err })
      })
  })

module.exports = router

const models = require('../../_models')
const express = require('express')
const router = express.Router()
const views = require('../../views/v1')
const { httpErrorResponse } = require('../../../common/error-handling/http')
const passport = require('passport')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)
const hasRole = require('../../../common/middleware/authorization/authorization').hasRole
const Converter = require('../../../common/converter')
const stripe = require('../../_utils/stripe/stripe')
const classyService = require('../../_services/classy/classy')
const { ValidationError } = require('../../../common/error-handling/errors')

router.route('/donations/:donation_id')
  .get(passport.authenticate('token', { session: false }), function (req, res) {
    models.AdoptProtectDonation
      .findAll({
        where: { guid: req.params.donation_id },
        include: [{ all: true }],
        limit: 1
      }).then(function (dbAdoptProtectDonation) {
        if (dbAdoptProtectDonation.length < 1) {
          httpErrorResponse(req, res, 404, 'database')
        } else {
          res.status(200).json(views.models.adoptProtectDonations(req, res, dbAdoptProtectDonation))
        }
      }).catch(function (err) {
        console.error('failed to return adopt protect donation | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return adopt protect donation' }) }
      })
  })

router.route('/donations')
  .get(passport.authenticate('token', { session: false }), function (req, res) {
    models.AdoptProtectDonation
      .findAll({
        where: { donor_email: req.query.donor_email.toLowerCase() },
        include: [{ all: true }],
        limit: 1
      }).then(function (dbAdoptProtectDonation) {
        if (dbAdoptProtectDonation.length < 1) {
          httpErrorResponse(req, res, 404, 'database')
        } else {
          res.status(200).json(views.models.adoptProtectDonations(req, res, dbAdoptProtectDonation))
        }
      }).catch(function (err) {
        console.error('failed to return adopt protect donation | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return adopt protect donation' }) }
      })
  })

router.route('/stripe/charge')
  .post(passport.authenticate(['token', 'jwt'], { session: false }), hasRole(['appUser', 'rfcxUser']), (req, res) => {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('token').toString()
    params.convert('amount').toFloat()
    params.convert('currency').toString()
    params.convert('description').toString()

    params.validate()
      .then(() => {
        return stripe.charges.create({
          amount: transformedParams.amount,
          currency: transformedParams.currency,
          description: transformedParams.description,
          source: transformedParams.token
        })
      })
      .then((data) => {
        res.status(200).json(data)
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => httpErrorResponse(req, res, 500, e, e.message || 'Error while running charge on Stripe.'))
  })

router.route('/classy/access-token')
  .get(passport.authenticate(['token', 'jwt'], { session: false }), hasRole(['appUser', 'rfcxUser']), (req, res) => {
    return classyService.requestAccessToken(process.env.CLASSY_CLIENT_ID, process.env.CLASSY_CLIENT_SECRET)
      .then((data) => {
        res.status(200).json(data)
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => { console.error('errrr', e); httpErrorResponse(req, res, 500, e, e.message || 'Error while getting Classy access token.') })
  })

router.route('/classy/save-stripe-donation')
  .post(passport.authenticate(['token', 'jwt'], { session: false }), hasRole(['appUser', 'rfcxUser']), (req, res) => {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('campaign_id').toString()
    params.convert('member_email_address').toString()
    params.convert('billing_first_name').optional().toString()
    params.convert('billing_last_name').optional().toString()
    params.convert('check_number').toString()
    params.convert('price').toFloat()
    params.convert('description').optional().toString()
    params.convert('token').toString()

    params.validate()
      .then(() => {
        return classyService.saveCampaignTransaction(
          transformedParams.campaign_id,
          {
            member_email_address: transformedParams.member_email_address,
            billing_first_name: transformedParams.billing_first_name,
            billing_last_name: transformedParams.billing_last_name
          },
          [{
            price: transformedParams.price,
            product_name: 'Offline transaction',
            type: 'donation'
          }],
          {
            check_number: transformedParams.check_number,
            description: transformedParams.description || '',
            payment_type: 'other',
            sync_third_party: true
          },
          transformedParams.token)
      })
      .then((data) => {
        res.status(200).json(data)
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => httpErrorResponse(req, res, 500, e, e.message || 'Error while running saving Stripe donation in Classy.'))
  })

router.route('/stripe/classy')
  .post(passport.authenticate(['token', 'jwt'], { session: false }), hasRole(['appUser', 'rfcxUser']), (req, res) => {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('token').toString()
    params.convert('amount').toFloat() // in dollars
    params.convert('currency').toString()
    params.convert('description').toString()

    params.convert('campaign_id').toString()
    params.convert('member_email_address').toString()
    params.convert('billing_first_name').optional().toString()
    params.convert('billing_last_name').optional().toString()
    params.convert('is_anonymous').optional().toBoolean()

    let stripeData

    params.validate()
      .then(() => {
        return stripe.charges.create({
          amount: transformedParams.amount * 100, // Stripe expects that this value is in cents
          currency: transformedParams.currency,
          description: transformedParams.description,
          source: transformedParams.token
        })
      })
      .then((data) => {
        if (data.status !== 'succeeded') {
          throw new ValidationError(data.failure_message || 'Error creating Stripe charge.')
        }
        stripeData = data
        return classyService.requestAccessToken(process.env.CLASSY_CLIENT_ID, process.env.CLASSY_CLIENT_SECRET)
      })
      .then((classyTokenData) => {
        return classyService.saveCampaignTransaction(
          transformedParams.campaign_id,
          {
            member_email_address: transformedParams.member_email_address,
            billing_first_name: transformedParams.billing_first_name,
            billing_last_name: transformedParams.billing_last_name,
            is_anonymous: transformedParams.is_anonymous
          },
          [{
            price: transformedParams.amount,
            product_name: 'Offline transaction',
            type: 'donation'
          }],
          {
            description: transformedParams.description || '',
            payment_type: 'other',
            sync_third_party: true
          },
          classyTokenData.access_token)
      })
      .then((classyData) => {
        res.status(200).json({
          stripe: stripeData,
          classy: classyData
        })
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => httpErrorResponse(req, res, 500, e, e.message || 'Error while processing the donation.'))
  })

module.exports = router

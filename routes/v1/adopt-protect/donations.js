var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var hash = require("../../../utils/misc/hash.js").hash;
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
var Promise = require("bluebird");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var hasRole = require('../../../middleware/authorization/authorization').hasRole;
var Converter = require("../../../utils/converter/converter");
const stripe = require('../../../utils/stripe/stripe');
const classyService = require('../../../services/classy/classy');
const ValidationError = require("../../../utils/converter/validation-error");

router.route("/donations/:donation_id")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.AdoptProtectDonation
      .findAll({
        where: { guid: req.params.donation_id },
        include: [ { all: true } ],
        limit: 1
      }).then(function(dbAdoptProtectDonation){

        if (dbAdoptProtectDonation.length < 1) {
          httpError(req, res, 404, "database");
        } else {
          res.status(200).json(views.models.adoptProtectDonations(req,res,dbAdoptProtectDonation));
        }

      }).catch(function(err){
        console.log("failed to return adopt protect donation | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return adopt protect donation"}); }
      });

  })
;

router.route("/donations")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.AdoptProtectDonation
      .findAll({
        where: { donor_email: req.query.donor_email.toLowerCase() },
        include: [ { all: true } ],
        limit: 1
      }).then(function(dbAdoptProtectDonation){

        if (dbAdoptProtectDonation.length < 1) {
          httpError(req, res, 404, "database");
        } else {
          res.status(200).json(views.models.adoptProtectDonations(req,res,dbAdoptProtectDonation));
        }

      }).catch(function(err){
        console.log("failed to return adopt protect donation | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return adopt protect donation"}); }
      });

  })
;

router.route('/stripe/charge')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['appUser', 'rfcxUser']), (req, res) => {

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('token').toString();
    params.convert('amount').toFloat();
    params.convert('currency').toString();
    params.convert('description').toString();

    params.validate()
      .then(() => {
        return stripe.charges.create({
          amount: transformedParams.amount,
          currency: transformedParams.currency,
          description: transformedParams.description,
          source: transformedParams.token,
        });
      })
      .then((data) => {
        res.status(200).json(data);
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => httpError(req, res, 500, e, e.message || 'Error while running charge on Stripe.'));

});

router.route('/classy/access-token')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['appUser', 'rfcxUser']), (req, res) => {

    return classyService.requestAccessToken(process.env.CLASSY_CLIENT_ID, process.env.CLASSY_CLIENT_SECRET)
      .then((data) => {
        res.status(200).json(data);
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => {console.log('errrr', e);  httpError(req, res, 500, e, e.message || 'Error while getting Classy access token.')});

});

router.route('/classy/save-stripe-donation')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['appUser', 'rfcxUser']), (req, res) => {

    let transformedParams = {};
    let params = new Converter(req.query, transformedParams);

    params.convert('campaign_id').toString();
    params.convert('member_email_address').toString();
    params.convert('billing_first_name').optional().toString();
    params.convert('billing_last_name').optional().toString();
    params.convert('token').toString();
    params.convert('price').toFloat();

    params.validate()
      .then(() => {
        return classyService.saveCampaignTransaction(
          transformedParams.campaign_id,
          transformedParams.member_email_address,
          [{
            // overhead_amount: 25, ???
            price: transformedParams.price,
            product_name: 'Offline transaction',
            type: 'donation'
          }],
          {
            // check_number: '123456', ???
            description: '',
            payment_type: 'other',
            sync_third_party: true
          },
          transformedParams.token);
      })
      .then((data) => {
        res.status(200).json(data);
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => httpError(req, res, 500, e, e.message || 'Error while running saving Stripe donation in Classy.'));

});

module.exports = router;

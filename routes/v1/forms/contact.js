var express = require("express");
var router = express.Router();
const httpError = require("../../../utils/http-errors");
const ValidationError = require("../../../utils/converter/validation-error");
const sequelize = require("sequelize");
const Promise = require("bluebird");
const Converter = require("../../../utils/converter/converter");
const mailService = require('../../../services/mail/mail-service');

router.route("/contact")
  .post((req, res) => {

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('_replyto').toString();
    params.convert('_subject').toString();
    params.convert('message').toString();

    params.validate()
      .then(() => {
        return mailService.renderContactFormEmail({
          _replyto: transformedParams['_replyto'],
          message: transformedParams.message
        });
      })
      .then((html) => {
        return mailService.sendMessage({
          from_name: 'RFCx Contact Form',
          email: 'contact@rfcx.org',
          subject: transformedParams['_subject'],
          html
        });
      })
      .then(result => res.status(200).json(result))
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { console.log('e', e); httpError(req, res, 500, e, "Email couldn't be sent.")});
  });

module.exports = router;

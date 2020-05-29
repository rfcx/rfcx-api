var verbose_logging = (process.env.NODE_ENV !== "production");
var models = require("../../../models");
var express = require("express");
var router = express.Router();
var httpError = require("../../../utils/http-errors.js");
var Converter = require("../../../utils/converter/converter");
var hasRole = require('../../../middleware/authorization/authorization').hasRole;
const generator = require('generate-password');
const redis = require('../../../utils/redis');
const ValidationError = require("../../../utils/converter/validation-error");
const EmptyResultError = require('../../../utils/converter/empty-result-error');
const passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);

router.route("/:shortlink_id")
  .get(function(req,res) {

    var linkId = req.params.shortlink_id, linkDelim = linkId.indexOf("+");
    var linkPre = (linkDelim > 0) ? linkId.substr(0,linkDelim) : null;
    linkId = (linkDelim > 0) ? linkId.substr(1+linkDelim) : linkId;

    if (linkPre === "ap") {
      res.redirect(301, "https://adopt-protect.rfcx.org/#/a/"+linkId.toLowerCase() );

    } else if (linkPre === "bt") {
      res.redirect(301, "https://bit.ly/"+linkId );

    } else {

      models.ShortLink
        .findOne({
          where: { guid: linkId },
          include: [ { all: true } ]
        }).then(function(dbShortLink){

          dbShortLink.access_count = 1 + dbShortLink.access_count;
          dbShortLink.save();

          console.log("redirecting client to: '"+dbShortLink.url+"'");
          res.redirect(301, dbShortLink.url );

        }).catch(function(err){
          // console.log("failed to return site | "+err);
          // if (!!err) { res.status(500).json({msg:"failed to return site"}); }
          res.status(200).json({ shortlink: req.params.shortlink_id });
        });

    }

  })
;

router.route("/s/:hash")
  .get(function(req,res) {

    let hash = req.params.hash;
    redis.getAsync(hash)
      .then((url) => {
        if (!url) {
          return httpError(req, res, 404, null, 'Short link not found.');
        }
        res.redirect(301, url);
      })
      .catch(e => { httpError(req, res, 500, e, "Error while getting the short link."); console.log(e) });

})

router.route("/")
  .get(function(req,res) {
    res.redirect(301, "https://rfcx.org/");
  })
;

router.route("/")
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('url').toString();
    params.convert('type').optional().toString().default('temp'); // temp or const
    params.convert('expires').optional().toInt().default(86400000); // 24 hours in ms

    params.validate()
      .then(() => {
        if (transformedParams.type === 'const') {
          return models.ShortLink.find({
            where: { url: transformedParams.url },
            include: [ { all: true } ]
          })
        }
        else {
          return null;
        }
      })
      .then((dbShortLink) => {
        if (dbShortLink) {
          return dbShortLink.guid;
        }
        let hash = generator.generate({
          length: 7,
          numbers: true,
          symbols: false,
          uppercase: true,
          excludeSimilarCharacters: false,
        });
        hash.toUpperCase();
        if (transformedParams.type === 'const') {
          return models.ShortLink.create({
            guid: hash,
            url: transformedParams.url,
            access_count: 0
          })
          .then((dbShortLink) => {
            return dbShortLink.guid;
          })
        }
        else {
          return redis.getAsync(hash)
            .then((url) => {
              if (!url) {
                redis.set(hash, transformedParams.url, 'PX', transformedParams.expires);
                return hash;
              }
              throw new Error('Error while getting the short link.');
            })
        }
      })
      .then(function(hash) {
        let url = `${process.env.REST_PROTOCOL}://${process.env.REST_HOST_SHORT}${(transformedParams.type !== 'const')?
         '/s' : ''}/${hash}`;
        res.status(200).send(url);
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { httpError(req, res, 500, e, 'Error while getting the short link.'); console.log(e) });
  });

module.exports = router;




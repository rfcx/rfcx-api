var express = require("express");
var router = express.Router();
var models  = require("../../../models");
var guid = require('../../../utils/misc/guid');
var hash = require("../../../utils/misc/hash.js").hash;
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
var sequelize = require("sequelize");
var ValidationError = require("../../../utils/converter/validation-error");
var ForbiddenError = require("../../../utils/converter/forbidden-error");
var EmptyResultError = require('../../../utils/converter/empty-result-error');
var hasRole = require('../../../middleware/authorization/authorization').hasRole;
const streamsService = require('../../../services/streams/streams-service');
const sitesService = require('../../../services/sites/sites-service');
const usersService = require('../../../services/users/users-service');
const Promise = require("bluebird");
const Converter = require("../../../utils/converter/converter");

const allowedVisibilities = ['private', 'public', 'site'];

router.route("/")
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('name').toString();
    params.convert('description').optional().toString();
    params.convert('starts').optional().toInt().minimum(0).maximum(4294967295);
    params.convert('ends').optional().toInt().minimum(0).maximum(4294967295);
    params.convert('location').optional().toString();
    params.convert('site').optional().toString();
    params.convert('visibility').optional().toString().default('private');

    params.validate()
      .then(() => {
        return usersService.getUserByGuid(req.rfcx.auth_token_info.guid);
      })
      .bind({})
      .then((user) => {
        transformedParams.guid = guid.generate();
        if (user) {
          transformedParams.created_by = user.id;
          this.user = usersService.formatUser(user);
        }
        return Promise.resolve();
      })
      .then(() => {
        if (transformedParams.site) {
          return sitesService.getSiteByGuid(transformedParams.site)
            .then((dbSite) => {
              if (!this.user.accessibleSites || !this.user.accessibleSites.length ||
                  !this.user.accessibleSites.includes(dbSite.guid)) {
                throw new ForbiddenError(`You are not allowed to add a stream with the site ${dbSite.guid}`);
              }
              transformedParams.site = dbSite.id;
            });
        }
        else {
          if (transformedParams.visibility !== 'private') {
            throw new ForbiddenError(`You are not allowed to make stream without adding a site.`);
          }
        }
        return Promise.resolve();
      })
      .then(() => {
        if (!allowedVisibilities.includes(transformedParams.visibility)) {
          throw new ValidationError(`Invalid visibility. Possible values are: "private", "public", "site".`);
        }
        return models.StreamVisibility.findOrCreate({
          where:    { value: transformedParams.visibility },
          defaults: { value: transformedParams.visibility }
        });
      })
      .spread((dbStreamVisibility) => {
        this.dbStreamVisibility = dbStreamVisibility;
        if (dbStreamVisibility) {
          transformedParams.visibility = dbStreamVisibility.id;
        }
        return Promise.resolve();
      })
      .then(() => {
        if (transformedParams.location) {
          return models.Location.findOne({ where: { guid: transformedParams.location } })
            .then((dbLocation) => {
              transformedParams.location = dbLocation.id;
            })
        }
        return Promise.resolve();
      })
      .then(() => {
        return models.Stream
          .create(transformedParams)
          .then((stream) => {
            return stream.reload({ include: [{ all: true }] });
          })
      })
      .then((dbStream) => {
        return streamsService.formatStream(dbStream);
      })
      .then((data) => {
        res.status(200).json(data);
      })
      .catch(ValidationError, e => { httpError(req, res, 400, null, e.message) })
      .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
      .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(e => { httpError(req, res, 500, e, 'Error while creating a stream.'); console.log(e) });
  });

// Stream update

router.route("/:guid")
  .post(passport.authenticate(["token", 'jwt', 'jwt-custom'], { session:false }), hasRole(['rfcxUser']), function(req,res) {

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('name').optional().toString();
    params.convert('description').optional().toString();
    params.convert('starts').optional().toInt().minimum(0).maximum(4294967295);
    params.convert('ends').optional().toInt().minimum(0).maximum(4294967295);
    params.convert('location').optional().toString();
    params.convert('site').optional().toString();
    params.convert('visibility').optional().toString();

    params.validate()
      .then(() => {
        return streamsService.getStreamByGuid(req.params.guid)
      })
      .bind({})
      .then((dbStream) => {
        this.dbStream = dbStream;
        return usersService.getUserByGuid(req.rfcx.auth_token_info.guid);
      })
      .then((user) => {
        this.user = usersService.formatUser(user);
        if (transformedParams.visibility) {
          if (!allowedVisibilities.includes(transformedParams.visibility)) {
            throw new ValidationError(`Invalid visibility. Possible values are: "private", "public", "site".`);
          }
          if (transformedParams.visibility !== 'private' && !transformedParams.site && !this.dbStream.Site) {
            throw new ForbiddenError(`You are not allowed to make stream without adding a site.`);
          }
          return models.StreamVisibility.findOne({ where: { value: transformedParams.visibility } })
            .then((dbStreamVisibility) => {
              transformedParams.visibility = dbStreamVisibility.id;
            });
        }
        return Promise.resolve();
      })
      .then(() => {
        if (transformedParams.site) {
          return sitesService.getSiteByGuid(transformedParams.site)
            .then((dbSite) => {
              if (!this.user.accessibleSites || !this.user.accessibleSites.length ||
                  !this.user.accessibleSites.includes(dbSite.guid)) {
                throw new ForbiddenError(`You are not allowed to add a stream with the site ${dbSite.guid}`);
              }
              transformedParams.site = dbSite.id;
            })
        }
        return Promise.resolve();
      })
      .then(() => {
        if (transformedParams.location) {
          return models.Location.findOne({ where: { name: transformedParams.location } })
            .then((dbLocation) => {
              transformedParams.location = dbLocation.id;
            });
        }
        return Promise.resolve();
      })
      .then(() => {
        return streamsService.updateStream(this.dbStream, transformedParams);
      })
      .then((dbStream) => {
        return streamsService.formatStream(dbStream);
      })
      .then(function(json) {
        res.status(200).send(json);
      })
      .catch(ValidationError, e => { httpError(req, res, 400, null, e.message) })
      .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
      .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(e => { httpError(req, res, 500, e, 'Error while updating the stream.'); console.log(e) });

  });

module.exports = router;

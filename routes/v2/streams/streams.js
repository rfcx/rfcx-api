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
    params.convert('starts').optional().toInt().minimum(0).maximum(32503669200000);
    params.convert('ends').optional().toInt().minimum(0).maximum(32503669200000);
    params.convert('location').optional().toString();
    params.convert('site').optional().toString();
    params.convert('visibility').optional().toString().default('private');

    let user;

    params.validate()
      .then(() => {
        return usersService.getUserByGuid(req.rfcx.auth_token_info.guid);
      })
      .bind({})
      .then((dbUser) => {
        transformedParams.guid = guid.generate();
        if (dbUser) {
          transformedParams.created_by = dbUser.id;
          user = usersService.formatUser(dbUser);
        }
        return Promise.resolve();
      })
      .then(() => {
        if (transformedParams.site) {
          return sitesService.getSiteByGuid(transformedParams.site)
            .then((dbSite) => {
              if (!user.accessibleSites || !user.accessibleSites.length ||
                  !user.accessibleSites.includes(dbSite.guid)) {
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

router.route("/master-segment")
  .post(passport.authenticate(["token", 'jwt', 'jwt-custom'], { session:false }), hasRole(['rfcxUser']), function(req,res) {

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('guid').toString();
    params.convert('filename').toString();
    params.convert('format').toString();
    params.convert('duration').toInt().minimum(1);
    params.convert('sample_count').toInt().minimum(1);
    params.convert('sample_rate').toInt().default(1).minimum(1);
    params.convert('channel_layout').optional().toString().default('mono');
    params.convert('channels_count').optional().toInt().default(1).minimum(1);
    params.convert('bit_rate').toInt().default(1).minimum(1);
    params.convert('codec').toString();

    params.validate()
      .then(() => {
        const sampleRateOpts = { value: transformedParams.sample_rate };
        return models.SampleRate.findOrCreate({
          where: sampleRateOpts,
          defaults: sampleRateOpts
        })
        .spread((dbSampleRate, created) => {
          transformedParams.sample_rate = dbSampleRate.id;
          return true;
        });
      })
      .then(() => {
        const formatOpts = { value: transformedParams.format };
        return models.Format.findOrCreate({
          where: formatOpts,
          defaults: formatOpts
        })
        .spread((dbFormat, created) => {
          transformedParams.format = dbFormat.id;
          return true;
        });
      })
      .then(() => {
        const channelLayoutOpts = { value: transformedParams.channel_layout };
        return models.ChannelLayout.findOrCreate({
          where: channelLayoutOpts,
          defaults: channelLayoutOpts
        })
        .spread((dbChannelLayout, created) => {
          transformedParams.channel_layout = dbChannelLayout.id;
          return true;
        });
      })
      .then(() => {
        const codecOpts = { value: transformedParams.codec };
        return models.Codec.findOrCreate({
          where: codecOpts,
          defaults: codecOpts
        })
        .spread((dbCodec, created) => {
          transformedParams.codec = dbCodec.id;
          return true;
        });
      })
      .then(() => {
        return streamsService.createMasterSegment(transformedParams);
      })
      .then((data) => {
        return streamsService.formatMasterSegment(data);
      })
      .then((data) => {
        res.status(200).json(data);
      })
      .catch(ValidationError, e => { httpError(req, res, 400, null, e.message) })
      .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
      .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(e => { httpError(req, res, 500, e, 'Error while creating master stream.'); console.log(e) });

  });

// Stream update

router.route("/:guid")
  .post(passport.authenticate(["token", 'jwt', 'jwt-custom'], { session:false }), hasRole(['rfcxUser']), function(req,res) {

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('name').optional().toString();
    params.convert('description').optional().toString();
    params.convert('starts').optional().toInt().minimum(0).maximum(32503669200000);
    params.convert('ends').optional().toInt().minimum(0).maximum(32503669200000);
    params.convert('location').optional().toString();
    params.convert('site').optional().toString();
    params.convert('visibility').optional().toString();

    let stream;
    let user;

    params.validate()
      .then(() => {
        return streamsService.getStreamByGuid(req.params.guid)
      })
      .then((dbStream) => {
        stream = dbStream;
        return usersService.getUserByGuid(req.rfcx.auth_token_info.guid);
      })
      .then((dbUser) => {
        user = usersService.formatUser(dbUser);
        if (transformedParams.visibility) {
          if (!allowedVisibilities.includes(transformedParams.visibility)) {
            throw new ValidationError(`Invalid visibility. Possible values are: "private", "public", "site".`);
          }
          if (transformedParams.visibility !== 'private' && !transformedParams.site && !stream.Site) {
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
              if (!user.accessibleSites || !user.accessibleSites.length ||
                  !user.accessibleSites.includes(dbSite.guid)) {
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
        return streamsService.updateStream(stream, transformedParams);
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

router.route("/:guid/segment")
  .post(passport.authenticate(["token", 'jwt', 'jwt-custom'], { session:false }), hasRole(['rfcxUser']), function(req,res) {

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('guid').optional().toString();
    params.convert('master_segment').toString();
    params.convert('starts').toInt().minimum(0).maximum(32503669200000);
    params.convert('ends').toInt().minimum(0).maximum(32503669200000);

    let stream;

    params.validate()
      .then(() => {
        return streamsService.getStreamByGuid(req.params.guid)
      })
      .then((dbStream) => {
        stream = dbStream;
        return streamsService.getMasterSegmentByGuid(transformedParams.master_segment);
      })
      .then((masterSegment) => {
        const opts = {
          starts: transformedParams.starts,
          ends: transformedParams.ends,
          stream: stream.id,
          master_segment: masterSegment.id
        };
        if (transformedParams.guid) {
          opts.guid = transformedParams.guid;
        }
        return models.Segment.create(opts)
        .then((dbSegment) => {
          return dbSegment.reload({ include: [{ all: true }] });
        })
      })
      .then((data) => {
        return streamsService.formatSegment(data);
      })
      .then(function(json) {
        res.status(200).send(json);
      })
      .catch(ValidationError, e => { httpError(req, res, 400, null, e.message) })
      .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
      .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(e => { httpError(req, res, 500, e, 'Error while creating the segment.'); console.log(e) });

  });

module.exports = router;

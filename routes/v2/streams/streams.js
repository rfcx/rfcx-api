var express = require("express");
var router = express.Router();
var models  = require("../../../models");
var hash = require("../../../utils/misc/hash.js").hash;
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
var sequelize = require("sequelize");
var ValidationError = require("../../../utils/converter/validation-error");
var ForbiddenError = require("../../../utils/converter/forbidden-error");
var EmptyResultError = require('../../../utils/converter/empty-result-error');
var hasRole = require('../../../middleware/authorization/authorization').hasRole;
const moment = require('moment-timezone');
const streamsService = require('../../../services/streams/streams-service');
const streamsAnnotationsService = require('../../../services/streams/streams-annotations-service');
const streamsAssetsService = require('../../../services/streams/streams-assets-service');
const sitesService = require('../../../services/sites/sites-service');
const usersService = require('../../../services/users/users-service');
const auth0Service = require('../../../services/auth0/auth0-service');
const Promise = require("bluebird");
const Converter = require("../../../utils/converter/converter");

const allowedVisibilities = ['private', 'public', 'site'];

router.route("/")
  .get(passport.authenticate(['jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    let data = {};

    return streamsService.countData(req)
      .then((total) => {
        data.total = total;
        return streamsService.queryData(req)
      })
      .then(streamsService.formatStreamsRaw)
      .then(function(streams) {
        data.streams = streams
        res.status(200).send(data);
      })
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { httpError(req, res, 500, e, "Error while searching streams."); console.log(e) });

  })

router.route("/:guid")
  .get(passport.authenticate(["token", 'jwt', 'jwt-custom'], { session:false }), hasRole(['rfcxUser', 'systemUser']), function(req,res) {

    streamsService.getStreamByGuid(req.params.guid)
      .then((dbStream) => {
        let userRoles = auth0Service.getUserRolesFromToken(req.user);
        if (!userRoles.includes('systemUser')) {
          streamsService.checkUserAccessToStream(req, dbStream);
        }
        return streamsService.formatStream(dbStream, { includeBounds: true });
      })
      .then(function(json) {
        res.status(200).send(json);
      })
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
      .catch(e => { httpError(req, res, 500, e, "Error while searching for the stream."); console.log(e) });

  })

router.route("/:guid/coverage")
  .get(passport.authenticate(['jwt', 'jwt-custom'], { session:false }), hasRole(['rfcxUser']), function(req,res) {

    let transformedParams = {};
    let params = new Converter(req.query, transformedParams);

    params.convert('starts').toInt().minimum(0).maximum(32503669200000);
    params.convert('ends').toInt().minimum(0).maximum(32503669200000);

    let stream;

    params.validate()
      .then(() => {
        return streamsService.getStreamByGuid(req.params.guid)
      })
      .then((dbStream) => {
        streamsService.checkUserAccessToStream(req, dbStream);
        stream = dbStream;
        let starts = transformedParams.starts;
        let ends = transformedParams.ends;
        return streamsService.getCachedCoverageForTime(dbStream.guid, starts, ends);
      })
      .then((coverage) => {
        if (coverage) {
          return coverage;
        }
        return streamsService.getSegments({ streamId: stream.id, starts: transformedParams.starts, ends: transformedParams.ends })
          .then((dbSegments) => {
            if (!dbSegments || !dbSegments.length) {
              return {  coverage: 0, gaps: [{
                starts: transformedParams.starts,
                ends: transformedParams.ends
              }] };
            }
            return streamsService.getCoverageForTime(dbSegments, transformedParams.starts, transformedParams.ends);
          })
          .then((data) => {
            return streamsService.cacheCoverageForTime(stream.guid, transformedParams.starts, transformedParams.ends, data);
          });
      })
      .then((json) => {
        stream = null;
        res.status(200).send(json);
      })
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
      .catch(e => { httpError(req, res, 500, e, "Error while getting stream coverage."); console.log(e) });

  })

router.route("/")
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('name').toString();
    params.convert('guid').optional().toString();
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
        transformedParams.guid = transformedParams.guid || hash.randomString(12);
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

// The daomon is going to call this endpoint every day and remove Streams which were marked as deleted 30 days ago.

router.route("/remove-expired-deleted-streams")
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session:false }), hasRole(['streamsAdmin', 'systemUser']), function(req, res) {

    return streamsService.findExpiredDeletedStreams()
      .then((dbStreams) => {
        console.log('Found', dbStreams.length, 'expired deleted streams. Removing now.');
        let proms = [];
        dbStreams.forEach((stream) => {
          proms.push(streamsService.deleteAllStreamData(stream));
        });
        return Promise.all(proms);
      })
      .then(function() {
        res.status(200).send({ success: true });
      })
      .catch(ValidationError, e => { httpError(req, res, 400, null, e.message) })
      .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
      .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(e => { httpError(req, res, 500, e, 'Error while deleting streams.'); console.log(e) });

  })

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

router.route("/:guid/move-to-trash")
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session:false }), hasRole(['rfcxUser']), function(req,res) {

  return streamsService.getStreamByGuid(req.params.guid)
    .then((dbStream) => {
      streamsService.checkUserWriteAccessToStream(req, dbStream);
      return streamsService.markStreamAsDeleted(dbStream);
    })
    .then(function(json) {
      res.status(200).send(json);
    })
    .catch(ValidationError, e => { httpError(req, res, 400, null, e.message) })
    .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
    .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
    .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
    .catch(e => { httpError(req, res, 500, e, 'Error while moving stream to trash.'); console.log(e) });

})

router.route("/:guid/restore")
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session:false }), hasRole(['rfcxUser']), function(req,res) {

  return streamsService.getStreamByGuid(req.params.guid)
    .then((dbStream) => {
      streamsService.checkUserWriteAccessToStream(req, dbStream);
      return streamsService.restoreStream(dbStream);
    })
    .then(function(json) {
      res.status(200).send(json);
    })
    .catch(ValidationError, e => { httpError(req, res, 400, null, e.message) })
    .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
    .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
    .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
    .catch(e => { httpError(req, res, 500, e, 'Error while restoring stream.'); console.log(e) });

})

router.route("/:guid")
  .delete(passport.authenticate(['jwt', 'jwt-custom'], { session:false }), hasRole(['streamsAdmin', 'systemUser', 'rfcxUser']), function(req,res) {

  let stream;

  return streamsService.getStreamByGuid(req.params.guid)
    .then((dbStream) => {
      stream = dbStream;
      return streamsService.isStreamEmpty(dbStream);
    })
    .then((isEmpty) => {
      let userRoles = auth0Service.getUserRolesFromToken(req.user);
      if (!auth0Service.hasAnyRoleFromArray(['streamsAdmin', 'systemUser'], userRoles)) {
        if (!isEmpty) {
          throw new ForbiddenError(`You don't have permissions to delete non-empty stream.`);
        }
        else {
          streamsService.checkUserWriteAccessToStream(req, stream);
        }
      }
      return streamsService.deleteAllStreamData(stream);
    })
    .then(() => {
      res.status(200).send({ success: true });
    })
    .catch(ValidationError, e => { httpError(req, res, 400, null, e.message) })
    .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
    .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
    .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
    .catch(e => { httpError(req, res, 500, e, 'Error while deleting the stream.'); console.log(e) })
    .finally(() => {
      stream = null;
    });

})

router.route("/:guid/master-segments")
  .post(passport.authenticate(["token", 'jwt', 'jwt-custom'], { session:false }), hasRole(['rfcxUser', 'systemUser']), function(req,res) {

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);
    let stream;

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
    params.convert('sha1_checksum').toString();
    params.convert('meta').optional();

    params.validate()
      .then(() => {
        return streamsService.getStreamByGuid(req.params.guid)
      })
      .then((dbStream) => {
        transformedParams.stream = dbStream.id;
        stream = dbStream;
        // check for duplicate master segment files in this stream
        return models.MasterSegment.findAll({
          where: {
            stream: dbStream.id,
            sha1_checksum: transformedParams.sha1_checksum
          }
        })
        .then((existingMasterSegment) => {
          if (existingMasterSegment && existingMasterSegment.length) {
            throw new ValidationError('Duplicate file. Matching sha1 signature already ingested.');
          }
          return true;
        });
      })
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
        if (transformedParams.meta && Object.keys(transformedParams.meta).length !== 0 && transformedParams.meta.constructor === Object) {
          transformedParams.meta = JSON.stringify(transformedParams.meta);
        }
        else {
          delete transformedParams.meta;
        }
        return streamsService.createMasterSegment(transformedParams);
      })
      .then((data) => {
        return streamsService.refreshStreamMaxSampleRate(stream)
          .then(() => {
            return streamsService.formatMasterSegment(data);
          });
      })
      .then((data) => {
        stream = null;
        res.status(200).json(data);
      })
      .catch(ValidationError, e => { httpError(req, res, 400, null, e.message) })
      .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
      .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(e => { httpError(req, res, 500, e, 'Error while creating master segment.'); console.log(e) });

  });

router.route("/master-segments/:guid")
  .delete(passport.authenticate(["token", 'jwt', 'jwt-custom'], { session:false }), hasRole(['systemUser']), (req, res) => {

    return streamsService.deleteMasterSegmentByGuid(req.params.guid)
      .then(() => {
        res.status(200).json({ success: true });
      })
      .catch(ValidationError, e => { httpError(req, res, 400, null, e.message) })
      .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
      .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(e => { httpError(req, res, 500, e, 'Error while deleting master segment.'); console.log(e) });

  });

router.route("/:guid/refresh-max-sample-rate")
  .post(passport.authenticate(["token", 'jwt', 'jwt-custom'], { session:false }), hasRole(['rfcxUser', 'systemUser']), function(req,res) {

    return streamsService.getStreamByGuid(req.params.guid)
      .then((dbStream) => {
        return streamsService.refreshStreamMaxSampleRate(dbStream);
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
      .catch(e => { httpError(req, res, 500, e, 'Error while refreshing max sample rate of the stream.'); console.log(e) });

  });

router.route("/:guid/segments")
  .post(passport.authenticate(["token", 'jwt', 'jwt-custom'], { session:false }), hasRole(['rfcxUser', 'systemUser']), function(req,res) {

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('guid').optional().toString();
    params.convert('master_segment').toString();
    params.convert('starts').toInt().minimum(0).maximum(32503669200000);
    params.convert('ends').toInt().minimum(0).maximum(32503669200000);
    params.convert('sample_count').toInt().minimum(1);
    params.convert('file_extension').toString();

    let stream, masterSegment;

    params.validate()
      .then(() => {
        return streamsService.getStreamByGuid(req.params.guid)
      })
      .then((dbStream) => {
        stream = dbStream;
        return streamsService.getMasterSegmentByGuid(transformedParams.master_segment);
      })
      .then((dbMasterSegment) => {
        masterSegment = dbMasterSegment;
        return models.FileExtension.findOrCreate({
          where: { [models.Sequelize.Op.or]: { value: transformedParams.file_extension }},
          defaults: { value: transformedParams.file_extension }
        })
      })
      .spread((dbFileExtension, created) => {
        const opts = {
          starts: transformedParams.starts,
          ends: transformedParams.ends,
          stream: stream.id,
          master_segment: masterSegment.id,
          sample_count: transformedParams.sample_count,
          file_extension: dbFileExtension.id,
        };
        if (transformedParams.guid) {
          opts.guid = transformedParams.guid;
        }
        return models.Segment.create(opts)
          .then((dbSegment) => {
            return dbSegment.reload({ include: [{ all: true }] });
          })
      })
      .then((segmentFormatted) => {
        return streamsService.refreshStreamStartEnd(stream)
          .then(() => {
            let starts = moment.tz(transformedParams.starts, 'UTC').startOf('day').valueOf();
            let ends = moment.tz(transformedParams.ends, 'UTC').endOf('day').valueOf();
            return streamsService.clearCacheForTime(stream.guid, starts, ends);
          })
          .then(() => {
            return segmentFormatted;
          });
      })
      .then((segmentFormatted) => {
        return streamsService.formatSegment(segmentFormatted);
      })
      .then(function(json) {
        stream = null;
        masterSegment = null;
        res.status(200).send(json);
      })
      .catch(ValidationError, e => { httpError(req, res, 400, null, e.message) })
      .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
      .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(e => { httpError(req, res, 500, e, 'Error while creating the segment.'); console.log(e) });

  });

router.route("/segments/:guid")
  .delete(passport.authenticate(["token", 'jwt', 'jwt-custom'], { session:false }), hasRole(['systemUser']), (req, res) => {

    return streamsService.deleteSegmentByGuid(req.params.guid)
      .then(() => {
        res.status(200).json({ success: true });
      })
      .catch(ValidationError, e => { httpError(req, res, 400, null, e.message) })
      .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
      .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(e => { httpError(req, res, 500, e, 'Error while deleting segment.'); console.log(e) });

  });

router.route("/:guid/segments")
  .get(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser', 'systemUser']), function(req,res) {

    let transformedParams = {};
    let params = new Converter(req.query, transformedParams);

    params.convert('starts').optional().toInt().minimum(0).maximum(32503669200000);
    params.convert('ends').optional().toInt().minimum(0).maximum(32503669200000);
    params.convert('limit').optional().toInt().minimum(0);
    params.convert('offset').optional().toInt().minimum(0);

    params.validate()
      .then(() => {
        return streamsService.getStreamByGuid(req.params.guid)
      })
      .then((dbStream) => {
        let userRoles = auth0Service.getUserRolesFromToken(req.user);
        if (!userRoles.includes('systemUser')) {
          streamsService.checkUserAccessToStream(req, dbStream);
        }
        let streamId = dbStream.id;
        let starts = transformedParams.starts? transformedParams.starts : dbStream.starts;
        let ends = transformedParams.ends? transformedParams.ends : dbStream.ends;
        let limit = transformedParams.limit;
        let offset = transformedParams.offset;
        return streamsService.getSegments({ streamId, starts, ends, limit, offset });
      })
      .then((dbSegments) => {
        return streamsService.formatSegments(dbSegments);
      })
      .then((data) => {
        res.status(200).send(data);
      })
      .catch(ValidationError, e => { httpError(req, res, 400, null, e.message) })
      .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
      .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(e => { httpError(req, res, 500, e, 'Error while searching for the segments.'); console.log(e) });
  });

router.route("/:guid/segment")
  .get(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser', 'systemUser']), function(req,res) {

    let transformedParams = {};
    let params = new Converter(req.query, transformedParams);

    params.convert('time').toInt().minimum(0).maximum(32503669200000);

    params.validate()
      .then(() => {
        return streamsService.getStreamByGuid(req.params.guid)
      })
      .then((dbStream) => {
        streamsService.checkUserAccessToStream(req, dbStream);
        return streamsService.getStreamSegmentByTime(dbStream.id, transformedParams.time);
      })
      .then((dbSegment) => {
        return streamsService.formatSegment(dbSegment);
      })
      .then((data) => {
        res.status(200).send(data);
      })
      .catch(ValidationError, e => { httpError(req, res, 400, null, e.message) })
      .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
      .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(e => { httpError(req, res, 500, e, 'Error while searching for the segment.'); console.log(e) });
  });

module.exports = router;

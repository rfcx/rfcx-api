const express = require("express");
var router = express.Router();
const path = require('path');
const passport = require("passport");
const httpError = require("../../../utils/http-errors.js");
const archiveUtil = require('../../../utils/misc/archive');
const dirUtil = require('../../../utils/misc/dir');
const fileUtil = require('../../../utils/misc/file');
const guidUtil = require('../../../utils/misc/guid');
const eventsServiceNeo4j = require('../../../services/events/events-service-neo4j');
const audioUtils = require('../../../utils/rfcx-audio/audio-serve').audioUtils;
const usersService = require('../../../services/users/users-service');
const usersServiceNeo4j = require('../../../services/users/users-service-neo4j');
const ValidationError = require("../../../utils/converter/validation-error");
const EmptyResultError = require('../../../utils/converter/empty-result-error');
const guardiansService = require('../../../services/guardians/guardians-service');
const hasRole = require('../../../middleware/authorization/authorization').hasRole;
const Converter = require("../../../utils/converter/converter");

var logDebug = loggers.debugLogger.log;
var logError = loggers.errorLogger.log;

router.route("/")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser', 'systemUser']), function (req, res) {

    return eventsServiceNeo4j.queryData(req)
      .then(function(json) {
        res.status(200).send(json);
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { httpError(req, res, 500, e, "Error while searching events."); console.log(e) });

  });

router.route("/reviews")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    return eventsServiceNeo4j.queryReviews(req)
      .then(function(json) {
        res.status(200).send(json);
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { httpError(req, res, 500, e, "Error while searching reviews."); console.log(e) });

  });

router.route("/reviews/ai-models")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session:false }), hasRole(['rfcxUser']), function(req,res) {

    return eventsServiceNeo4j.getAiModelsForReviews(req)
      .then((data) => {
        res.status(200).send(data);
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { httpError(req, res, 500, e, "Could not find AI models."); console.log(e) });
  });

router.route("/reviews/download")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser', 'systemUser']), function (req, res) {

    let tempGuid = guidUtil.generate();
    let reviewsPath = path.join(process.env.CACHE_DIRECTORY, 'reviews');

    return dirUtil.ensureDirExists(reviewsPath)
      .then(() => {
        return eventsServiceNeo4j.queryReviews(req);
      })
      .then((data) => {
        if (!data.length) {
          throw new EmptyResultError('No reviews found for requested parameters.');
        }
        return eventsServiceNeo4j.formatReviewsForFiles(data);
      })
      .then((files) => {
        return archiveUtil.archiveStrings(reviewsPath, `reviews-${tempGuid}.zip`, files);
      })
      .then((zipPath) => {
        return fileUtil.serveFile(res, zipPath, 'reviews.zip', 'application/zip, application/octet-stream', !!req.query.inline);
      })
      .catch(EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(e => { console.log(e); httpError(req, res, 500, e, "Error while searching reviews."); })

  });

router.route("/:guid/windows")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser', 'systemUser']), function (req, res) {

    return eventsServiceNeo4j.queryWindowsForEvent(req.params.guid)
      .then(function(json) {
        res.status(200).send(json);
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { httpError(req, res, 500, e, "Error while searching for event tags."); console.log(e) });

  });

router.route("/:guid/trigger")
  .post(passport.authenticate(['jwt', 'jwt-custom'], {session: false}), hasRole(['systemUser']), function (req, res) {

    return eventsServiceNeo4j.getEventInfoByGuid(req.params.guid)
      .bind({})
      .then((data) => {
        this.eventData = data;
        return guardiansService.getGuardianByGuid(data.event.guardianGuid);
      })
      .then((guardian) => {
        this.guardian = guardian;
        this.notificationData = {
          audio_guid: this.eventData.event.audioGuid,
          measured_at: this.eventData.event.audioMeasuredAt,
          value: this.eventData.label.value,
          guardian_id: this.guardian.id,
          guardian_guid: this.guardian.guid,
          guardian_shortname: this.guardian.shortname,
          latitude: this.guardian.latitude,
          longitude: this.guardian.longitude,
          site_guid: this.eventData.event.siteGuid,
          ai_guid: this.eventData.ai.guid,
          ai_name: this.eventData.ai.name,
          ignore_time: req.body.ignore_time !== undefined? (req.body.ignore_time === true) : undefined,
        };
        return eventsServiceNeo4j.sendPushNotificationsForEvent(this.notificationData);
      })
      .then(() => {
        res.status(200).send({ success: true });
      })
      .catch(EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { httpError(req, res, 500, e, "Error while triggering event notification."); console.log(e) });

  });

router.route("/:guid/review")
  .post(passport.authenticate(['jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('confirmed').toBoolean();
    params.convert('windows').toArray();

    let user = usersService.getUserDataFromReq(req);
    let timestamp = (new Date()).valueOf();

    return params.validate()
      .then(() => {
        return usersServiceNeo4j.ensureUserExistsNeo4j(user);
      })
      .then(() => {
        return eventsServiceNeo4j.clearEventReview(req.params.guid);
      })
      .then(() => {
        return eventsServiceNeo4j.reviewEvent(req.params.guid, transformedParams.confirmed, user, timestamp);
      })
      .then(() => {
        return eventsServiceNeo4j.clearAudioWindowsReview(transformedParams.windows);
      })
      .then(() => {
        return eventsServiceNeo4j.reviewAudioWindows(transformedParams.windows, user, timestamp);
      })
      .then(() => {
        res.status(200).send({ success: true });
      })
      .catch(EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { httpError(req, res, 500, e, "Error while saving review data."); console.log(e) });

  });

module.exports = router;

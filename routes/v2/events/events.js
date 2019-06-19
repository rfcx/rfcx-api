const express = require("express");
var router = express.Router();
const passport = require("passport");
const httpError = require("../../../utils/http-errors.js");
const eventsServiceNeo4j = require('../../../services/events/events-service-neo4j');
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
          value: this.eventData.entity.rfcxLabel,
          guardian_id: this.guardian.id,
          guardian_guid: this.guardian.guid,
          guardian_shortname: this.guardian.shortname,
          latitude: this.guardian.latitude,
          longitude: this.guardian.longitude,
          site_guid: this.eventData.event.siteGuid,
          ai_guid: this.eventData.ai.guid,
          ai_name: this.eventData.ai.name,
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

module.exports = router;

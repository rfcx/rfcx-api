var models = require("../../models");
var sequelize = require("sequelize");
const moment = require("moment-timezone");

function formatGuardianAudioEventTypesValues(arr) {
  return arr.map((item) => {
      return item.value;
    });
}

function getGuardianAudioEventValues() {
  return models.GuardianAudioEventValue
    .findAll()
    .then((data) => {
      return formatGuardianAudioEventTypesValues(data);
    });
}

function getGuardianAudioEventTypes() {
  return models.GuardianAudioEventType
    .findAll()
    .then((data) => {
      return formatGuardianAudioEventTypesValues(data);
    });
}

function updateEventReview(guid, confirmed, user_id) {

  return models.GuardianAudioEvent
    .findOne({
      where: { guid: guid },
      include: [
        {
          model: models.User,
          as: 'User',
          attributes: [
            'guid',
            'firstname',
            'lastname',
            'email'
          ]
        },
      ]
    })
    .then((event) => {
      if (!event) {
        throw new sequelize.EmptyResultError('Event with given guid not found.');
      }
      else {
        event.reviewer_confirmed = confirmed;
        event.reviewed_by = user_id;
        return event.save();
      }
    })
    .then((event) => {
      // reload event to refresh included models
      return event.reload();
    })
    .then((event) => {
      return {
        guid: event.guid,
        reviewer_confirmed: event.reviewer_confirmed,
        reviewer_guid: event.User? event.User.guid : null,
        reviewer_firstname: event.User? event.User.firstname : null,
        reviewer_lastname: event.User? event.User.lastname : null,
        reviewer_email: event.User? event.User.email : null
      }
    });
}

function prepareWsObject(event, site) {
  let timezone = site.timezone;
  let guardian = event.Guardian;
  return {
    time: {
      start: {
        UTC: moment.tz(event.begins_at, timezone).toISOString(),
        localTime: moment.tz(event.begins_at, timezone).format(),
        timeZone: timezone
      },
      end: {
        UTC: moment.tz(event.ends_at, timezone).toISOString(),
        localTime: moment.tz(event.ends_at, timezone).format(),
        timeZone: timezone
      }
    },
    location: {
      coordinates: [guardian.longitude, guardian.latitude, site.guid],
      type: 'point'
    },
    type: event.Type.value,
    value: event.Value.value,
    probability: event.confidence,
    sensationGuids: [event.Audio.guid],
    cognitionGuid: event.guid
  }
}

module.exports = {
  getGuardianAudioEventValues: getGuardianAudioEventValues,
  getGuardianAudioEventTypes: getGuardianAudioEventTypes,
  updateEventReview: updateEventReview,
  prepareWsObject: prepareWsObject,
};

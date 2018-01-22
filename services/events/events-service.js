var models = require("../../models");
var sequelize = require("sequelize");

const eventQueryBase =
  'SELECT GuardianAudioEvent.guid, GuardianAudioEvent.confidence, GuardianAudioEvent.windows, ' +
    'GuardianAudioEvent.begins_at, GuardianAudioEvent.ends_at, GuardianAudioEvent.shadow_latitude, ' +
    'GuardianAudioEvent.shadow_longitude, GuardianAudioEvent.reviewer_confirmed, GuardianAudioEvent.created_at, ' +
    'GuardianAudioEvent.updated_at, ' +
    'CONVERT_TZ(GuardianAudioEvent.begins_at, "UTC", Site.timezone) as begins_at_local, ' +
    'CONVERT_TZ(GuardianAudioEvent.ends_at, "UTC", Site.timezone) as ends_at_local, ' +
    'Audio.guid AS audio_guid, Audio.measured_at AS audio_measured_at, ' +
    'Site.guid AS site_guid, Site.timezone as site_timezone, ' +
    'Guardian.guid AS guardian_guid, Guardian.shortname AS guardian_shortname, ' +
    'Model.guid AS model_guid, Model.minimal_detection_confidence AS model_minimal_detection_confidence, ' +
      'Model.shortname AS model_shortname, ' +
    'User.guid AS user_guid, ' +
    'EventType.value AS event_type, ' +
    'EventValue.value AS event_value ' +
    'FROM GuardianAudioEvents AS GuardianAudioEvent ' +
    'LEFT JOIN GuardianAudio AS Audio ON GuardianAudioEvent.audio_id = Audio.id ' +
    'LEFT JOIN GuardianSites AS Site ON Audio.site_id = Site.id ' +
    'LEFT JOIN Guardians AS Guardian ON Audio.guardian_id = Guardian.id ' +
    'LEFT JOIN AudioAnalysisModels AS Model ON GuardianAudioEvent.model = Model.id ' +
    'LEFT JOIN Users AS User ON GuardianAudioEvent.reviewed_by = User.id ' +
    'LEFT JOIN GuardianAudioEventTypes AS EventType ON GuardianAudioEvent.type = EventType.id ' +
    'LEFT JOIN GuardianAudioEventValues AS EventValue ON GuardianAudioEvent.value = EventValue.id ';

function getEventByGuid(guid) {

  let sql = eventQueryBase + 'WHERE GuardianAudioEvent.guid = :guid;';
  return models.sequelize
    .query(sql, { replacements: { guid: guid }, type: models.sequelize.QueryTypes.SELECT })
    .then((event) => {
      if (!event.length) {
        throw new sequelize.EmptyResultError('Event with given guid not found.');
      }
      return event;
    });
}

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

module.exports = {
  getEventByGuid: getEventByGuid,
  getGuardianAudioEventValues: getGuardianAudioEventValues,
  getGuardianAudioEventTypes: getGuardianAudioEventTypes,
  updateEventReview: updateEventReview,
  eventQueryBase: eventQueryBase,
};

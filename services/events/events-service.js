var models = require("../../models");
var sequelize = require("sequelize");

function formatGuardianAudioEventValues(arr) {
  return arr.map((item) => {
      return item.value;
    });
}

function getGuardianAudioEventValues() {
  return models.GuardianAudioEventValue
    .findAll()
    .then((data) => {
      return formatGuardianAudioEventValues(data);
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
  getGuardianAudioEventValues: getGuardianAudioEventValues,
  updateEventReview: updateEventReview
};

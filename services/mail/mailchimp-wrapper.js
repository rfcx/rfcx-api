const rp = require("request-promise");
const ValidationError = require('../../utils/converter/validation-error');

module.exports = {
  subsribeToList: function (listId, email) {
    var request = require("request");

    var options = { method: 'POST',
      url: `${process.env.MAILCHIMP_API_URL}/lists/${listId}/members`,
      auth: {
          user: 'anystring',
          password: process.env.MAILCHIMP_KEY
      },

      body: { email_address: email, status: 'subscribed' },
      json: true
    };

    return rp(options).catch(body =>{
        if(body.error.title == "Member Exists"){
          return {};
        }
        throw new ValidationError(body.error.detail);
    });
  }
};
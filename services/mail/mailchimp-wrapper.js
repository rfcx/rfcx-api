const rp = require("request-promise");
const ValidationError = require('../../utils/converter/validation-error');
const mandrill = require('mandrill-api/mandrill');
const Promise = require('bluebird');

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
  },
  sendMail: function(email_address, name, subject, message){

    return new Promise(function(resolve, reject) {
      const mandrill_client = new mandrill.Mandrill(process.env.MANDRILL_KEY);
      var msg = {
        "text": message,
        "subject": subject,
        "from_email": "contact@rfcx.org",
        "from_name": "Rainforest Connection",
        "to": [{
          "email": email_address,
          "name": name == "" ? null : name,
          "type": "to"
        }],

        "auto_html": true
      };

      mandrill_client.messages.send({"message": msg, "async": true}, function() {
        resolve({success: true});
      }, function(e){
        reject(new Error(`Error sending mail: ${e.name} - ${e.message}`));
      });

    });






  }
};
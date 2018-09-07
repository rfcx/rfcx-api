var Converter = require("../../utils/converter/converter");
const Promise = require("bluebird");
const mailing = require('./mailchimp-wrapper');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');


function sendTextMail(serviceRequest) {
  var params = {};
  serviceRequest = new Converter(serviceRequest, params);
  serviceRequest.convert("email_address").toString();
  serviceRequest.convert("recipient_name").optional().default('').toString();
  serviceRequest.convert("subject").toString();
  serviceRequest.convert("message").toString();

  return serviceRequest.validate()
    .then(()=> {
      return mailing.sendMail(params.email_address, params.recipient_name, params.subject, params.message);
    });
}

function sendMessage(serviceRequest) {
  var params = {};
  serviceRequest = new Converter(serviceRequest, params);
  serviceRequest.convert('text').optional().default('').toString();
  serviceRequest.convert('html').optional().default('').toString();
  serviceRequest.convert('subject').optional().toString();
  serviceRequest.convert('from_email').optional().toString();
  serviceRequest.convert('from_name').optional().toString();
  serviceRequest.convert('email').toString();
  serviceRequest.convert('name').optional().toString();
  serviceRequest.convert('important').optional().toBoolean();
  serviceRequest.convert('bcc_address').optional().toString();

  return serviceRequest.validate()
    .then(()=> {
      return mailing.sendMessage(params);
    });
}

function renderContactFormEmail(opts) {
  return new Promise((resolve, reject) => {
    try {
      let source = fs.readFileSync(path.join(__dirname, '../../views/email/contact-form.handlebars'), 'utf8');
      let template = handlebars.compile(source);
      resolve(template(opts));
    }
    catch (e) {
      reject(e);
    }
  });
}

function registerToAppWaitingList(serviceRequest) {
  var params = {};
  serviceRequest = new Converter(serviceRequest, params);

  serviceRequest.convert("email_address").toString();
  serviceRequest.convert("requested_os").optional().default('iOS').toString();


  return serviceRequest.validate().then(()=> {
    return mailing.subsribeToList(process.env.MAILCHIMP_APP_WAITING_LIST, params.email_address);
  }).then(()=>{
    return {email_address: params.email_address, method: "subscribe_to_list", success: true}
  });
}

module.exports = {
  registerToAppWaitingList,
  sendTextMail,
  sendMessage,
  renderContactFormEmail,
};

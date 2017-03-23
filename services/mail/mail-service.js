var Converter = require("../../utils/converter/converter");

// currently mailchimp but wec an replace it as long as the interface remains stable
const mailing =require('./mailchimp-wrapper');

module.exports = {
  registerToAppWaitingList: function (serviceRequest) {
    var params = {};
    serviceRequest = new Converter(serviceRequest, params);

    serviceRequest.convert("email_address").toString();
    serviceRequest.convert("requested_os").optional("iOS").toString();



    return serviceRequest.validate().then(()=> {
      return mailing.subsribeToList(process.env.MAILCHIMP_APP_WAITING_LIST, params.email_address);
    }).then(()=>{
      return {email_address: params.email_address, method: "subscribe_to_list", success: true}
    });
  }

};
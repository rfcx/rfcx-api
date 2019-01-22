const request = require('request');
const Promise = require('bluebird');

function requestAccessToken(client_id, client_secret) {
  return new Promise((resolve, reject) => {
    var options = {
      method: 'POST',
      url: `https://api.classy.org/oauth2/auth`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      json: true,
      body: {
        client_id,
        client_secret,
        grant_type: 'client_credentials'
      }
    };
    request(options, (error, response, body) => {
      if (error) {
        reject(error);
      }
      else if (!!body && !!body.error) {
        reject(body);
      }
      else {
        resolve(body);
      }
    });
  });
}

function saveCampaignTransaction(transactionId, memberEmail, items, offlinePaymentInfo, token) {
  items = (Array.isArray(items)? items : [items]);

  return new Promise((resolve, reject) => {
    var options = {
      method: 'POST',
      url: `https://api.classy.org/2.0/campaigns/${transactionId}/transactions`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      json: true,
      body: {
        member_email_address: memberEmail,
        items: items,
        offline_payment_info: offlinePaymentInfo,
      }
    };
    request(options, (error, response, body) => {
      if (error) {
        reject(error);
      }
      else if (!!body && !!body.error) {
        reject(body);
      }
      else {
        resolve(body);
      }
    });
  });
}

module.exports = {
  requestAccessToken,
  saveCampaignTransaction,
};

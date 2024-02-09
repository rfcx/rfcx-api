/* eslint-disable camelcase */
const request = require('request')
const Promise = require('bluebird')

function requestAccessToken (client_id, client_secret) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      url: 'https://api.classy.org/oauth2/auth',
      headers: {
        'Content-Type': 'application/json'
      },
      json: true,
      body: {
        client_id,
        client_secret,
        grant_type: 'client_credentials'
      }
    }
    request(options, (error, response, body) => {
      if (error) {
        reject(error)
      } else if (!!body && !!body.error) {
        reject(body)
      } else {
        resolve(body)
      }
    })
  })
}

function saveCampaignTransaction (campaignId, memberInfo, items, offlinePaymentInfo, token) {
  items = (Array.isArray(items) ? items : [items])

  const body = {
    member_email_address: memberInfo.member_email_address,
    items,
    offline_payment_info: offlinePaymentInfo,
    is_anonymous: !!memberInfo.is_anonymous
  }
  if (memberInfo.billing_first_name) {
    body.billing_first_name = memberInfo.billing_first_name
  }
  if (memberInfo.billing_last_name) {
    body.billing_last_name = memberInfo.billing_last_name
  }

  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      url: `https://api.classy.org/2.0/campaigns/${campaignId}/transactions`,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      json: true,
      body
    }
    request(options, (error, response, body) => {
      if (error) {
        reject(error)
      } else if (!!body && !!body.error) {
        reject(body)
      } else {
        resolve(body)
      }
    })
  })
}

module.exports = {
  requestAccessToken,
  saveCampaignTransaction
}

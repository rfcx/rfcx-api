var hooks = require('hooks')

var stash = {}

// hook to retrieve session on a login
hooks.after('Authentication > Retrieve Token > Example 1', function (transaction) {
  stash.guid = JSON.parse(transaction.real.body).token.guid
  stash.token = JSON.parse(transaction.real.body).token.token
})

// hook to set the session cookie in all following requests
hooks.beforeEach(function (transaction) {
  if (stash.token !== undefined && stash.guid !== undefined) {
    transaction.request.headers['x-auth-user'] = 'token/' + stash.guid
    transaction.request.headers['x-auth-token'] = stash.token
  }
})

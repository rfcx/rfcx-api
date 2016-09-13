var hooks = require('hooks');

// this code is required for login to the API using user account
// replace email and password with real account data, which exists in db
hooks.before('Console App > Authentication > Retrieve token', function (transaction) {
  var requestBody = JSON.parse(transaction.request.body);
  // modify request body
  requestBody['email'] = 'test@local.com';
  requestBody['password'] = '123123';
  // stringify the new body to request
  transaction.request.body = JSON.stringify(requestBody);
});
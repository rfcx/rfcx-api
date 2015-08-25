var util = require("util");

exports.models = {

  users: function(req,res,dbUser) {

    if (!util.isArray(dbUser)) { dbUser = [dbUser]; }
    
    var jsonArray = [];

    for (i in dbUser) {

      var dbRow = dbUser[i];

      var user = {
        guid: dbRow.guid,
        type: dbRow.type,
        username: dbRow.username,
        email: dbRow.email,
        is_email_validated: dbRow.is_email_validated,
        last_login_at: dbRow.last_login_at,
        tokens: []
      };

      if (dbRow.VisibleToken != null) { user.tokens = [dbRow.VisibleToken]; }

      jsonArray.push(user);
    }
    return jsonArray;

  }


};


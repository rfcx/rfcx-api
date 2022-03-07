exports.models = {

  users: function (req, res, dbUser) {
    if (!Array.isArray(dbUser)) { dbUser = [dbUser] }

    const jsonArray = []

    for (const i in dbUser) {
      const dbRow = dbUser[i]

      const user = {
        guid: dbRow.guid,
        type: dbRow.type,
        username: dbRow.username,
        firstname: dbRow.firstname,
        lastname: dbRow.lastname,
        email: dbRow.email,
        is_email_validated: dbRow.is_email_validated,
        last_login_at: dbRow.last_login_at,
        tokens: []
      }

      if (dbRow.VisibleToken != null) { user.tokens = [dbRow.VisibleToken] }

      jsonArray.push(user)
    }
    return jsonArray
  },

  usersPublic: function (req, res, dbUser) {
    if (!Array.isArray(dbUser)) { dbUser = [dbUser] }

    const jsonArray = []

    for (const i in dbUser) {
      const dbRow = dbUser[i]

      const user = {
        guid: dbRow.guid,
        username: dbRow.username,
        email: dbRow.email
      }

      jsonArray.push(user)
    }
    return jsonArray
  }

}

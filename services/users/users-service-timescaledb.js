const models = require('../../modelsTimescale');
const usersService = require('./users-service');
const EmptyResultError = require('../../utils/converter/empty-result-error')

function getByParams(where, opts = {}) {
  return models.User.findOne({ where })
    .then(item => {
      if (!item) {
        throw new EmptyResultError('User with given parameters not found.')
      }
      return item
    });
}

function getByGuid(guid, opts = {}) {
  return getByParams({ guid }, opts);
}

function getByEmail(email, opts = {}) {
  return getByParams({ email }, opts);
}

function getByGuidOrEmail(guid, email) {
  return getByParams({ [models.Sequelize.Op.or]: { guid, email } });
}

async function ensureUserSynced(req) {

  // get combined data from MySQL and Auth0 token
  const user = await usersService.collectUserDataForSync(req);

  const where = {
    guid: user.guid,
    email: user.email
  };

  let defaults = { ...where };
  ['id', 'username', 'firstname', 'lastname', 'picture'].forEach((attr) => {
    if (user[attr]) defaults[attr] = user[attr];
  })

  return models.User.findOrCreate({ where, defaults })
    .spread((dbUser, created) => {
      if (!created) {
        // if some of attributes have changed since last sync then update user
        if (Object.keys(defaults).some(x => !!defaults[x] && dbUser[x] !== defaults[x])) {
          return dbUser.update(defaults);
        }
        return dbUser;
      }
    });

}

module.exports = {
  getByParams,
  getByGuid,
  getByEmail,
  getByGuidOrEmail,
  ensureUserSynced,
};

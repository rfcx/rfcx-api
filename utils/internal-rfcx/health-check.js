const models = require('../../models')
const modelsTimescale = require('../../modelsTimescale')
const redisEnabled = `${process.env.REDIS_ENABLED}` === 'true'
const redis = redisEnabled ? require('../../utils/redis') : {}

function calcStatus (status, start) {
  return {
    status,
    time: Date.now() - start
  }
}

async function mySQLConnected () {
  const start = Date.now()
  try {
    await models.sequelize.authenticate()
    return calcStatus(true, start)
  } catch (e) {
    return calcStatus(false, start)
  }
}

async function timescaleDBConnected () {
  const start = Date.now()
  try {
    await modelsTimescale.sequelize.authenticate()
    return calcStatus(true, start)
  } catch (e) {
    return calcStatus(false, start)
  }
}

// redis.connected doesn't react to network changes in a good way, so we will send dummy request then.
// We use Promise.race to have a default timeout of 3 seconds. Redis is very fast DB, so it should respond quicker than 3 sec.
async function redisConnected () {
  const start = Date.now()
  let timeout
  return Promise.race([
    redis.getAsync('test'),
    new Promise((resolve, reject) => { timeout = setTimeout(() => { reject(new Error()) }, 3000) })
  ])
    .then(() => {
      clearTimeout(timeout)
      return calcStatus(true, start)
    })
    .catch(() => {
      return calcStatus(false, start)
    })
}

async function check (req, res) {
  const rtrnJson = {
    status: false,
    mysql: false,
    timescaledb: false,
    ...redisEnabled && { redis: false }
  }
  if (req.query.headers === '1') { rtrnJson.http_headers = {}; for (const i in req.headers) { rtrnJson.http_headers[i] = req.headers[i] } }
  const proms = [mySQLConnected(), timescaleDBConnected()]
  if (redisEnabled) {
    proms.push(redisConnected())
  }
  return Promise.all(proms)
    .then((data) => {
      rtrnJson.mysql = data[0]
      rtrnJson.timescaledb = data[1]
      if (redisEnabled) {
        rtrnJson.redis = data[2]
      }
      rtrnJson.status = !data.includes(false)
      res.json(rtrnJson)
    })
    .catch(() => {
      res.status(500).json(rtrnJson)
    })
}

module.exports = check

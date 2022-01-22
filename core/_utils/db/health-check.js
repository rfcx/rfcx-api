const models = require('../../_models')

function calcStatus (status, start) {
  return {
    status,
    time: Date.now() - start
  }
}

async function timescaleDBConnected () {
  const start = Date.now()
  try {
    await models.sequelize.authenticate()
    return calcStatus(true, start)
  } catch (e) {
    return calcStatus(false, start)
  }
}

async function check (req, res) {
  const rtrnJson = {
    status: false,
    timescaledb: false
  }
  if (req.query.headers === '1') { rtrnJson.http_headers = {}; for (const i in req.headers) { rtrnJson.http_headers[i] = req.headers[i] } }
  const proms = [timescaleDBConnected()]

  return Promise.all(proms)
    .then((data) => {
      rtrnJson.timescaledb = data[1]
      rtrnJson.status = !data.includes(false)
      res.json(rtrnJson)
    })
    .catch(() => {
      res.status(500).json(rtrnJson)
    })
}

module.exports = check

const crypto = require('crypto')
const iotdaApp = require('../../iotda')
const moment = require('moment')
const { GuardianMetaSentinelPower, GuardianMetaBattery, Sequelize } = require('../../_models')

async function parse (pingObj) {
  const requiredData = await getRequiredSentinelDataModel(pingObj)
  if (requiredData === null) {
    return null
  }

  const time = moment(requiredData.timestamp).utc()

  const messageBody = {
    services: [
      {
        service_id: 'GuardianDiagnostic',
        properties: {
          ...requiredData
        },
        event_time: `${time.format('YYYYMMDD')}T${time.format('HHmmss')}Z`
      }
    ]
  }
  return messageBody
}

function getIoTDAConnectionOptions (pingObj, now) {
  const guid = pingObj.db.dbGuardian.guid
  const key = `${now.format('YYYYMMDDHH')}`
  const clientId = `${guid}_0_0_${key}`
  const password = crypto.createHmac('sha256', key).update('rfcxrfcx').digest('hex')

  return {
    clientId,
    username: guid,
    password
  }
}

async function forward (pingObj) {
  const targetProject = pingObj.db.dbGuardian.project_id
  if (iotdaApp.availableProjects.includes(targetProject)) {
    const mqttMessage = await parse(pingObj)
    const device = getIoTDAConnectionOptions(pingObj, moment.utc())
    if (mqttMessage) {
      iotdaApp.forwardMessage(device, mqttMessage)
    }
  }
}

async function getRequiredSentinelDataModel (pingObj) {
  const guardianId = pingObj.db.dbGuardian.id
  // not precise and can be undefined if sentinel_power is not presence
  const measuredAt = (pingObj.json.sentinel_power) ? parseInt(pingObj.json.sentinel_power.split('*')[1]) : undefined
  const startAt = (measuredAt) ? measuredAt - 300000 : undefined
  const endAt = (measuredAt) ? measuredAt + 300000 : undefined

  // return if cannot get startAt and endAt time
  if (startAt === undefined && endAt === undefined) {
    return null
  }
  const sentinelPower = await GuardianMetaSentinelPower.findOne({ where: { guardian_id: guardianId, measured_at: { [Sequelize.Op.between]: [startAt, endAt] } }, order: [['created_at', 'DESC']] })
  const internalBattery = await GuardianMetaBattery.findOne({ where: { guardian_id: guardianId, measured_at: { [Sequelize.Op.between]: [startAt, endAt] } }, order: [['created_at', 'DESC']] })

  const requiredData = {}
  if (sentinelPower) {
    requiredData.mainBatteryPercentage = sentinelPower.battery_state_of_charge
    requiredData.systemPower = sentinelPower.system_power
    requiredData.inputPower = sentinelPower.input_power
    requiredData.timestamp = sentinelPower.measured_at
  }

  if (internalBattery) {
    requiredData.internalBatteryPercentage = internalBattery.battery_percent
  }

  return requiredData
}

module.exports = { forward, parse, getIoTDAConnectionOptions }

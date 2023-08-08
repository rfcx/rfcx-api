const crypto = require('crypto')
const iotdaApp = require('../../iotda')
const moment = require('moment')
const models = require('../../_models')

async function parse (pingObj) {
  const requiredData = await getRequiredSentinelDataModel(pingObj)
  const time = moment(requiredData.timestamp).utc()

  const messageBody = {
    services: [
      {
        service_id: 'TestService',
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
    clientId: clientId,
    username: guid,
    password: password
  }
}

async function forward (pingObj) {
  const targetProject = pingObj.db.dbGuardian.project_id
  if (iotdaApp.availableProjects.includes(targetProject)) {
    const mqttMessage = await parse(pingObj)
    const device = getIoTDAConnectionOptions(pingObj, moment.utc())
    iotdaApp.forwardMessage(device, mqttMessage)
  }
}

async function getRequiredSentinelDataModel (pingObj) {
  const guardianId = pingObj.db.dbGuardian.id
  const sentinelPower = await models.GuardianMetaSentinelPower.findOne({ where: { guardian_id: guardianId }, order: [['created_at', 'DESC']] })
  const internalBattery = await models.GuardianMetaBattery.findOne({ where: { guardian_id: guardianId }, order: [['created_at', 'DESC']] })
  const requiredData = {
    internalBatteryPercentage: internalBattery.battery_percent,
    mainBatteryPercentage: sentinelPower.battery_state_of_charge,
    systemPower: sentinelPower.system_power,
    inputPower: sentinelPower.input_power,
    timestamp: sentinelPower.measured_at
  }
  return requiredData
}

module.exports = { forward, parse, getIoTDAConnectionOptions }

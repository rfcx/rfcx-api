const { GuardianMetaSensor, GuardianMetaSensorComponent, GuardianMetaSensorValue } = require('../../_models')

module.exports = async function (payloadArr, guardianId) {
  for (const payload of payloadArr) {
    const [component] = await GuardianMetaSensorComponent.findOrCreate({ where: { shortname: payload.component } })
    await GuardianMetaSensorValue.bulkCreate(
      await Promise.all(payload.values.map(async (value, position) => {
        const [sensor] = await GuardianMetaSensor.findOrCreate({ where: { component_id: component.id, payload_position: position } })
        return { guardian_id: guardianId, measured_at: payload.timestamp, sensor_id: sensor.id, value }
      }))
    )
  }
}

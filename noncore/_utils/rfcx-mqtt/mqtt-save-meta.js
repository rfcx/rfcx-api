const models = require('../../_models')
const { parse: parseDetections } = require('./mqtt-detections-parse')
const detectionsService = require('../../../core/detections/dao/create')

const compactKeysSoftwareRole = { g: 'guardian', a: 'admin', c: 'classify', u: 'updater' }
const compactKeysStorage = { i: 'internal', e: 'external' }
const compactKeysMemory = { s: 'system' }
const compactKeysSentinelPower = { s: 'system', i: 'input', b: 'battery' }
const compactKeysCheckIns = { s: 'sent', q: 'queued', m: 'meta', sk: 'skipped', st: 'stashed', a: 'archived', v: 'vault' }

exports.saveMeta = {

  CPU: function (metaCPU, guardianId, checkInId) {
    const dbMetaCPU = []

    for (const cpuInd in metaCPU) {
      if ((parseInt(metaCPU[cpuInd][1]) <= 100) && (parseInt(metaCPU[cpuInd][1]) >= 0) &&
          (parseInt(metaCPU[cpuInd][2]) <= 5000) && (parseInt(metaCPU[cpuInd][2]) >= 0)
      ) {
        dbMetaCPU.push({
          guardian_id: guardianId,
          check_in_id: checkInId,
          measured_at: new Date(parseInt(metaCPU[cpuInd][0])),
          cpu_percent: parseInt(metaCPU[cpuInd][1]),
          cpu_clock: parseInt(metaCPU[cpuInd][2])
        })
      }
    }

    return models.GuardianMetaCPU.bulkCreate(dbMetaCPU).catch(function (err) {
      console.error('failed to create GuardianMetaCPU | ' + err)
    })
  },

  Battery: async function (metaBattery, guardianId, checkInId) {
    const dbMetaBattery = []

    console.log('\n\nmetaBattery', metaBattery, '\n\n')
    for (const battInd in metaBattery) {
      dbMetaBattery.push({
        guardian_id: guardianId,
        check_in_id: checkInId,
        measured_at: new Date(parseInt(metaBattery[battInd][0])),
        battery_percent: parseInt(metaBattery[battInd][1]),
        battery_temperature: parseInt(metaBattery[battInd][2]),
        is_charging: (metaBattery[battInd][3] === '1') ? true : ((metaBattery[battInd][3] === '0') ? false : null),
        is_fully_charged: (metaBattery[battInd][4] === '1') ? true : ((metaBattery[battInd][4] === '0') ? false : null)
      })
    }

    const lastBattery = dbMetaBattery.sort((a, b) => { return b.measured_at - a.measured_at })[0]
    console.log('\n\nlast_battery_internal', lastBattery, guardianId, '\n\n')
    await models.Guardian.update({
      last_battery_internal: lastBattery ? lastBattery.battery_percent : null
    }, { where: { id: guardianId } })

    return models.GuardianMetaBattery.bulkCreate(dbMetaBattery).catch(function (err) {
      console.error('failed to create GuardianMetaBattery | ' + err)
    })
  },

  Network: function (metaNetwork, guardianId, checkInId) {
    const dbMetaNetwork = []

    for (const ntwkInd in metaNetwork) {
      dbMetaNetwork.push({
        guardian_id: guardianId,
        check_in_id: checkInId,
        measured_at: new Date(parseInt(metaNetwork[ntwkInd][0])),
        signal_strength: parseInt(metaNetwork[ntwkInd][1]),
        network_type: metaNetwork[ntwkInd][2],
        carrier_name: metaNetwork[ntwkInd][3]
      })
    }

    return models.GuardianMetaNetwork.bulkCreate(dbMetaNetwork).catch(function (err) {
      console.error('failed to create GuardianMetaNetwork | ' + err)
    })
  },

  DataTransfer: function (metaDataTransfer, guardianId, checkInId) {
    const dbMetaDataTransfer = []

    for (const dtInd in metaDataTransfer) {
      const networkBytesRx = (metaDataTransfer[dtInd][6] == null) ? 0 : parseInt(metaDataTransfer[dtInd][6])
      const networkBytesTx = (metaDataTransfer[dtInd][7] == null) ? 0 : parseInt(metaDataTransfer[dtInd][7])
      const networkTotalBytesRx = (metaDataTransfer[dtInd][8] == null) ? 0 : parseInt(metaDataTransfer[dtInd][8])
      const networkTotalBytesTx = (metaDataTransfer[dtInd][9] == null) ? 0 : parseInt(metaDataTransfer[dtInd][9])

      dbMetaDataTransfer.push({

        guardian_id: guardianId,
        check_in_id: checkInId,
        started_at: new Date(parseInt(metaDataTransfer[dtInd][0])),
        ended_at: new Date(parseInt(metaDataTransfer[dtInd][1])),

        mobile_bytes_received: parseInt(metaDataTransfer[dtInd][2]),
        mobile_bytes_sent: parseInt(metaDataTransfer[dtInd][3]),
        mobile_total_bytes_received: parseInt(metaDataTransfer[dtInd][4]),
        mobile_total_bytes_sent: parseInt(metaDataTransfer[dtInd][5]),

        network_bytes_received: networkBytesRx,
        network_bytes_sent: networkBytesTx,
        network_total_bytes_received: networkTotalBytesRx,
        network_total_bytes_sent: networkTotalBytesTx,

        bytes_received: parseInt(metaDataTransfer[dtInd][2]) + networkBytesRx,
        bytes_sent: parseInt(metaDataTransfer[dtInd][3]) + networkBytesTx,
        total_bytes_received: parseInt(metaDataTransfer[dtInd][4]) + networkTotalBytesRx,
        total_bytes_sent: parseInt(metaDataTransfer[dtInd][5]) + networkTotalBytesTx
      })
    }

    return models.GuardianMetaDataTransfer
      .bulkCreate(dbMetaDataTransfer).catch(function (err) {
        console.error('failed to create GuardianMetaDataTransfer | ' + err)
      })
  },

  LightMeter: function (metaLightMeter, guardianId, checkInId) {
    const dbMetaLightMeter = []

    for (const lmInd in metaLightMeter) {
      dbMetaLightMeter.push({
        guardian_id: guardianId,
        check_in_id: checkInId,
        measured_at: new Date(parseInt(metaLightMeter[lmInd][0])),
        luminosity: parseInt(metaLightMeter[lmInd][1])
      })
    }

    return models.GuardianMetaLightMeter.bulkCreate(dbMetaLightMeter)
  },

  Accelerometer: function (metaAccelerometer, guardianId, checkInId) {
    const dbMetaAccelerometer = []

    for (const acInd in metaAccelerometer) {
      const xyzVals = metaAccelerometer[acInd][1].split(',')
      dbMetaAccelerometer.push({
        guardian_id: guardianId,
        check_in_id: checkInId,
        measured_at: new Date(parseInt(metaAccelerometer[acInd][0])),
        x: parseFloat(xyzVals[0]),
        y: parseFloat(xyzVals[1]),
        z: parseFloat(xyzVals[2]),
        sample_count: parseInt(metaAccelerometer[acInd][2])
      })
    }

    return models.GuardianMetaAccelerometer.bulkCreate(dbMetaAccelerometer)
  },

  GeoPosition: function (metaPosition, guardianId, checkInId) {
    const dbMetaGeoPosition = []

    for (const locInd in metaPosition) {
      if (metaPosition[locInd][1] != null) {
        const latLng = metaPosition[locInd][1].split(',')
        const accAlt = metaPosition[locInd][2].split(',')
        dbMetaGeoPosition.push({
          guardian_id: guardianId,
          check_in_id: checkInId,
          measured_at: new Date(parseInt(metaPosition[locInd][0])),
          latitude: parseFloat(latLng[0]),
          longitude: parseFloat(latLng[1]),
          accuracy: parseInt(accAlt[0]),
          altitude: parseInt(accAlt[1])
        })
      }
    }

    return models.GuardianMetaGeoPosition.bulkCreate(dbMetaGeoPosition)
  },

  Device: function (metaDevice, guardianId) {
    const { a, p, h, ...others } = metaDevice
    const fullDevice = { ...others }
    if (a !== undefined) {
      const fullAndroid = { product: a.p, brand: a.br, model: a.m, build: a.bu, android: a.a, manufacturer: a.mf }
      fullDevice.android = fullAndroid
    }
    if (p !== undefined) {
      const fullPhone = { sim: p.s, number: p.n, imei: p.imei, imsi: p.imsi }
      fullDevice.phone = fullPhone
    }

    return models.GuardianMetaHardware
      .findOrCreate({
        where: { guardian_id: guardianId }
      })
      .then(([dbMetaHardware, wasCreated]) => {
        if (fullDevice.android != null) {
          dbMetaHardware.manufacturer = fullDevice.android.manufacturer
          dbMetaHardware.brand = fullDevice.android.brand
          dbMetaHardware.model = fullDevice.android.model
          dbMetaHardware.product = fullDevice.android.product
          dbMetaHardware.android_version = fullDevice.android.android
          dbMetaHardware.android_build = fullDevice.android.build
        }

        if (fullDevice.phone != null) {
          dbMetaHardware.phone_imsi = (fullDevice.phone.imsi != null) ? fullDevice.phone.imsi : null
          dbMetaHardware.phone_imei = (fullDevice.phone.imei != null) ? fullDevice.phone.imei : null
          dbMetaHardware.phone_sim_serial = (fullDevice.phone.sim != null) ? fullDevice.phone.sim : null
          dbMetaHardware.phone_sim_number = (fullDevice.phone.number != null) ? fullDevice.phone.number : null
          dbMetaHardware.phone_sim_carrier = (fullDevice.phone.carrier != null) ? fullDevice.phone.carrier : null
        }

        return dbMetaHardware.save()
      })
  },

  DateTimeOffset: function (metaDateTimeOffset, guardianId, checkInId) {
    const dbMetaDateTimeOffset = []

    for (const dtoInd in metaDateTimeOffset) {
      if (metaDateTimeOffset[dtoInd][2] != null) {
        dbMetaDateTimeOffset.push({
          guardian_id: guardianId,
          check_in_id: checkInId,
          measured_at: new Date(parseInt(metaDateTimeOffset[dtoInd][0])),
          source: metaDateTimeOffset[dtoInd][1],
          system_clock_offset: parseInt(metaDateTimeOffset[dtoInd][2]),
          system_clock_timezone: metaDateTimeOffset[dtoInd][3]
        })
      }
    }

    return models.GuardianMetaDateTimeOffset.bulkCreate(dbMetaDateTimeOffset)
  },

  MqttBrokerConnection: function (metaBrokerConnection, guardianId, checkInId) {
    const dbMetaBrokerConnection = []

    for (const brkrInd in metaBrokerConnection) {
      if (metaBrokerConnection[brkrInd][3] != null) {
        dbMetaBrokerConnection.push({
          guardian_id: guardianId,
          check_in_id: checkInId,
          connected_at: new Date(parseInt(metaBrokerConnection[brkrInd][0])),
          connection_latency: parseInt(metaBrokerConnection[brkrInd][1]),
          subscription_latency: parseInt(metaBrokerConnection[brkrInd][2]),
          broker_uri: metaBrokerConnection[brkrInd][3]
        })
      }
    }

    return models.GuardianMetaMqttBrokerConnection.bulkCreate(dbMetaBrokerConnection).catch(function (err) {
      console.error('failed to create GuardianMetaMqttBrokerConnection | ' + err)
    })
  },

  Storage: function (metaDiskUsage, guardianId, checkInId) {
    const diskUsage = { internal: {}, external: {} }

    for (const duInd in metaDiskUsage) {
      const typeRaw = metaDiskUsage[duInd][0]
      const type = Object.keys(compactKeysStorage).includes(typeRaw) ? compactKeysStorage[typeRaw] : typeRaw
      diskUsage[type] = {
        measured_at: new Date(parseInt(metaDiskUsage[duInd][1])),
        used: parseInt(metaDiskUsage[duInd][2]),
        available: parseInt(metaDiskUsage[duInd][3])
      }
    }

    const dbMetaDiskUsage = []
    if ((metaDiskUsage.length > 0) && (diskUsage.internal.measured_at != null)) {
      dbMetaDiskUsage.push({
        guardian_id: guardianId,
        measured_at: diskUsage.internal.measured_at,
        internal_bytes_available: diskUsage.internal.available,
        internal_bytes_used: diskUsage.internal.used,
        external_bytes_available: diskUsage.external.available,
        external_bytes_used: diskUsage.external.used
      })
    }

    return models.GuardianMetaDiskUsage.bulkCreate(dbMetaDiskUsage).catch(function (err) {
      console.error('failed to create GuardianMetaDataTransfer | ' + err)
    })
  },

  Memory: function (metaMemory, guardianId, checkInId) {
    const memory = { system: {} }

    for (const mInd in metaMemory) {
      const typeRaw = metaMemory[mInd][0]
      const type = Object.keys(compactKeysMemory).includes(typeRaw) ? compactKeysMemory[typeRaw] : typeRaw
      memory[type] = {
        measured_at: new Date(parseInt(metaMemory[mInd][1])),
        used: parseInt(metaMemory[mInd][2]),
        available: parseInt(metaMemory[mInd][3]),
        minimum: parseInt(metaMemory[mInd][4])
      }
    }
    const dbMetaMemory = []
    if ((metaMemory.length > 0) && (memory.system.measured_at != null)) {
      dbMetaMemory.push({
        guardian_id: guardianId,
        measured_at: memory.system.measured_at,
        system_bytes_available: memory.system.available,
        system_bytes_used: memory.system.used,
        system_bytes_minimum: memory.system.minimum/*,
        external_bytes_available: memory.external.available,
        external_bytes_used: memory.external.used */
      })
    }

    return models.GuardianMetaMemory.bulkCreate(dbMetaMemory).catch(function (err) {
      console.error('failed to create GuardianMetaMemory | ' + err)
    })
  },

  SentinelPower: async function (metaSntnlPwr, guardianId, checkInId) {
    const sntnlPwrEntries = { }

    for (const duInd in metaSntnlPwr) {
      const sysInpBattRaw = metaSntnlPwr[duInd][0] + ''
      const sysInpBatt = Object.keys(compactKeysSentinelPower).includes(sysInpBattRaw) ? compactKeysSentinelPower[sysInpBattRaw] : sysInpBattRaw

      const timeStamp = metaSntnlPwr[duInd][1] + ''

      if (sntnlPwrEntries[timeStamp] == null) {
        sntnlPwrEntries[timeStamp] = {
          temperature: null,
          system: { voltage: null, current: null, power: null },
          input: { voltage: null, current: null, power: null },
          battery: { voltage: null, current: null, power: null }
        }
      }

      sntnlPwrEntries[timeStamp][sysInpBatt].voltage = parseInt(metaSntnlPwr[duInd][2])
      sntnlPwrEntries[timeStamp][sysInpBatt].current = parseInt(metaSntnlPwr[duInd][3])
      sntnlPwrEntries[timeStamp][sysInpBatt].power = parseInt(metaSntnlPwr[duInd][5])

      if ((sysInpBatt === 'system') && (parseInt(metaSntnlPwr[duInd][4]) > 0)) {
        sntnlPwrEntries[timeStamp].temperature = parseInt(metaSntnlPwr[duInd][4])
      }

      if ((sysInpBatt === 'battery') && (metaSntnlPwr[duInd][4].length > 0)) {
        sntnlPwrEntries[timeStamp].state_of_charge = parseFloat(metaSntnlPwr[duInd][4])
        if ((sntnlPwrEntries[timeStamp].state_of_charge > 110) || (sntnlPwrEntries[timeStamp].state_of_charge < -10)) {
          sntnlPwrEntries[timeStamp].state_of_charge = null
        }
      }
    }

    const dbMetaSentinelPower = []

    for (const sntPwrInd in sntnlPwrEntries) {
      if (parseInt(sntPwrInd) > 0) {
        dbMetaSentinelPower.push({
          guardian_id: guardianId,
          check_in_id: checkInId,
          measured_at: new Date(parseInt(sntPwrInd)),
          system_temperature: sntnlPwrEntries[sntPwrInd].temperature,
          system_voltage: sntnlPwrEntries[sntPwrInd].system.voltage,
          system_current: sntnlPwrEntries[sntPwrInd].system.current,
          system_power: sntnlPwrEntries[sntPwrInd].system.power,
          input_voltage: sntnlPwrEntries[sntPwrInd].input.voltage,
          input_current: sntnlPwrEntries[sntPwrInd].input.current,
          input_power: sntnlPwrEntries[sntPwrInd].input.power,
          battery_state_of_charge: sntnlPwrEntries[sntPwrInd].state_of_charge,
          battery_voltage: sntnlPwrEntries[sntPwrInd].battery.voltage,
          battery_current: sntnlPwrEntries[sntPwrInd].battery.current,
          battery_power: sntnlPwrEntries[sntPwrInd].battery.power
        })
      }
    }

    const lastBattery = dbMetaSentinelPower.sort((a, b) => { return b.measured_at - a.measured_at })[0]
    console.log('\n\nlast_battery_main update', lastBattery, guardianId, '\n\n')
    await models.Guardian.update({
      last_battery_main: lastBattery ? lastBattery.battery_state_of_charge : null
    }, { where: { id: guardianId } })

    return models.GuardianMetaSentinelPower.bulkCreate(dbMetaSentinelPower).catch(function (err) {
      console.error('failed to create GuardianMetaSentinelPower | ' + err)
    })
  },

  SentinelSensor: function (sensorTag, metaSntnlSnsr, guardianId, checkInId) {
    const dbMetaSentinelSensor = []

    for (const sntInd in metaSntnlSnsr) {
      if (metaSntnlSnsr[sntInd][0] === sensorTag) {
        if (sensorTag === 'compass') {
          dbMetaSentinelSensor.push({
            guardian_id: guardianId,
            check_in_id: checkInId,
            measured_at: new Date(parseInt(metaSntnlSnsr[sntInd][1])),
            x_mag_field: parseInt(metaSntnlSnsr[sntInd][2]),
            y_mag_field: parseInt(metaSntnlSnsr[sntInd][3]),
            z_mag_field: parseInt(metaSntnlSnsr[sntInd][4]),
            sample_count: (parseInt(metaSntnlSnsr[sntInd][5]) < 1) ? 1 : parseInt(metaSntnlSnsr[sntInd][5])
          })
        } else if (sensorTag === 'accelerometer') {
          dbMetaSentinelSensor.push({
            guardian_id: guardianId,
            check_in_id: checkInId,
            measured_at: new Date(parseInt(metaSntnlSnsr[sntInd][1])),
            x_milli_g_force_accel: parseInt(metaSntnlSnsr[sntInd][2]),
            y_milli_g_force_accel: parseInt(metaSntnlSnsr[sntInd][3]),
            z_milli_g_force_accel: parseInt(metaSntnlSnsr[sntInd][4]),
            sample_count: (parseInt(metaSntnlSnsr[sntInd][5]) < 1) ? 1 : parseInt(metaSntnlSnsr[sntInd][5])
          })
        }
      }
    }

    if (sensorTag === 'compass') {
      return models.GuardianMetaSentinelCompass.bulkCreate(dbMetaSentinelSensor)
    } else if (sensorTag === 'accelerometer') {
      return models.GuardianMetaSentinelAccelerometer.bulkCreate(dbMetaSentinelSensor)
    } else {
      return models.GuardianMetaSentinelAccelerometer.bulkCreate([])
    }
  },

  CheckInStatus: function (metaCheckInStatus, guardianId, measuredAt) {
    const dbMetaCheckInStatus = []
    const dbMetaCheckInStatusObj = { guardian_id: guardianId, measured_at: parseInt(measuredAt) }

    for (const vInd in metaCheckInStatus) {
      const typeRaw = metaCheckInStatus[vInd][0]
      const type = Object.keys(compactKeysCheckIns).includes(typeRaw) ? compactKeysCheckIns[typeRaw] : typeRaw
      dbMetaCheckInStatusObj[type + '_count'] = parseInt(metaCheckInStatus[vInd][1])
      if (metaCheckInStatus[vInd][2] != null) {
        dbMetaCheckInStatusObj[type + '_size_bytes'] = parseInt(metaCheckInStatus[vInd][2])
      }
    }
    dbMetaCheckInStatus.push(dbMetaCheckInStatusObj)

    return models.GuardianMetaCheckInStatus.bulkCreate(dbMetaCheckInStatus).catch(function (err) {
      console.error('failed to create GuardianMetaCheckInStatus | ' + err)
    })
  },

  PreviousCheckIns: function (previousCheckIns) {
    for (const prvChkInInd in previousCheckIns) {
      models.GuardianCheckIn
        .findOne({
          where: { guid: previousCheckIns[prvChkInInd][0] }
        })
        .then((dbPreviousCheckIn) => {
          if (!dbPreviousCheckIn) {
            return Promise.reject(`Couldn't find previous checkin with guid "${previousCheckIns[prvChkInInd][0]}".`) // eslint-disable-line prefer-promise-reject-errors
          }
          dbPreviousCheckIn.request_latency_guardian = parseInt(previousCheckIns[prvChkInInd][1])
          dbPreviousCheckIn.request_size = parseInt(previousCheckIns[prvChkInInd][2])
          return dbPreviousCheckIn.save()
        })
    }
  },

  RebootEvents: function (rebootEvents, guardianId, checkInId) {
    const dbMetaRebootEvents = []

    for (const rebootEvntInd in rebootEvents) {
      dbMetaRebootEvents.push({
        guardian_id: guardianId,
        check_in_id: checkInId,
        completed_at: new Date(parseInt(rebootEvents[rebootEvntInd][0]))
      })
    }

    return models.GuardianMetaReboot.bulkCreate(dbMetaRebootEvents)
  },

  SoftwareRoleVersion: function (roleArr, guardianId) {
    const roleVersions = {}
    const proms = []
    for (const vInd in roleArr) {
      const roleRaw = roleArr[vInd][0]
      const role = Object.keys(compactKeysSoftwareRole).includes(roleRaw) ? compactKeysSoftwareRole[roleRaw] : roleRaw
      roleVersions[role] = roleArr[vInd][1]
      const prom = models.GuardianSoftware
        .findOne({ where: { role } })
        .then((dbSoftwareRole) => {
          if (!dbSoftwareRole) {
            return Promise.reject(`Role "${role}" was not found.`) // eslint-disable-line prefer-promise-reject-errors
          }
          return models.GuardianSoftwareVersion
            .findAll({
              where: { software_role_id: dbSoftwareRole.id, version: roleVersions[dbSoftwareRole.role] },
              order: [['created_at', 'DESC']],
              limit: 1
            })
            .then((dbSoftwareRoleVersion) => {
              if (dbSoftwareRoleVersion.length < 1) {
                const opts = { software_role_id: dbSoftwareRole.id, version: roleVersions[dbSoftwareRole.role] }
                return models.GuardianSoftwareVersion
                  .findOrCreate({
                    where: opts,
                    defaults: opts
                  })
                  .then(([dbSoftwareRoleVersionInsertion, wasCreatedInsertion]) => {
                    dbSoftwareRoleVersionInsertion.updated_at = new Date()
                    return dbSoftwareRoleVersionInsertion.save()
                  })
              } else {
                return models.GuardianMetaSoftwareVersion
                  .findOrCreate({
                    where: { guardian_id: guardianId, software_id: dbSoftwareRole.id, version_id: dbSoftwareRoleVersion[0].id }
                  })
                  .then(([dbMetaSoftware, wasCreatedInsertion]) => {
                    dbMetaSoftware.updated_at = new Date()
                    return dbMetaSoftware.save()
                  })
              }
            })
        })
      proms.push(prom)
    }
    return Promise.all(proms)
  },

  Detections: function (payloadArr, guardianId) {
    if (payloadArr.length === 0) {
      return
    }
    // TODO remove temporary logging to debug satellite guardians
    console.info(`${guardianId}: detections payload: ${payloadArr.join('|')}`)

    const expandedDetections = []
    for (const payload of payloadArr) {
      let detections
      try {
        detections = parseDetections(payload)
      } catch (error) {
        continue
      }
      expandedDetections.push(...detections.map(d => ({ streamId: guardianId, ...d })))
    }

    // Force first batch tembe guardians to use `-edge` for classifier name
    for (const d of expandedDetections) {
      if (d.classifier.startsWith('chainsaw-v')) {
        d.classifier = d.classifier.replace('chainsaw', 'chainsaw-edge')
      }
    }

    if (expandedDetections.length > 0) {
      // TODO remove temporary logging to debug satellite guardians
      console.info(`${guardianId}: detections payload: saving ${expandedDetections.length} detections`)

      return detectionsService.create(expandedDetections)
    }
    return Promise.resolve()
  },

  SwarmDiagnostics: function (payloadArr, guardianId, checkInId) {
    const dbMetaNetwork = []

    for (const payload of payloadArr) {
      // Payload specification:
      // measured_at, background_rssi, [satellite_rssi, snr, fdev, time, satellite_id,] num_of_unsent_messages
      const measuredAt = new Date(parseInt(payload[0]))

      // Always contains background at index 1
      const backgroundRssi = parseInt(payload[1])
      if (!isNaN(backgroundRssi)) {
        dbMetaNetwork.push({
          guardian_id: guardianId,
          check_in_id: checkInId,
          measured_at: measuredAt,
          signal_strength: backgroundRssi,
          network_type: 'background',
          carrier_name: 'Swarm'
        })
      }
      // Optionally contains satellite packet (indexes 2-6)
      if (payload.length === 8) {
        const satelliteRssi = parseInt(payload[2])
        if (!isNaN(satelliteRssi)) {
          dbMetaNetwork.push({
            guardian_id: guardianId,
            check_in_id: checkInId,
            measured_at: measuredAt,
            signal_strength: satelliteRssi,
            network_type: 'satellite',
            carrier_name: 'Swarm'
          })
        }
        // TODO Save additional satellite packet properties
      }
      // TODO Save unsent messages information
    }

    return models.GuardianMetaNetwork.bulkCreate(dbMetaNetwork)
  },

  SensorValues: require('./mqtt-save-meta-sensorvalues')

}

const models = require('../../models')

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

    return models.GuardianMetaCPU.bulkCreate(dbMetaCPU)
  },

  Battery: function (metaBattery, guardianId, checkInId) {
    const dbMetaBattery = []

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

    return models.GuardianMetaBattery.bulkCreate(dbMetaBattery)
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

    return models.GuardianMetaNetwork.bulkCreate(dbMetaNetwork)
  },

  DataTransfer: function (metaDataTransfer, guardianId, checkInId) {
    const dbMetaDataTransfer = []

    for (const dtInd in metaDataTransfer) {
      dbMetaDataTransfer.push({
        guardian_id: guardianId,
        check_in_id: checkInId,
        started_at: new Date(parseInt(metaDataTransfer[dtInd][0])),
        ended_at: new Date(parseInt(metaDataTransfer[dtInd][1])),
        bytes_received: parseInt(metaDataTransfer[dtInd][2]),
        bytes_sent: parseInt(metaDataTransfer[dtInd][3]),
        total_bytes_received: parseInt(metaDataTransfer[dtInd][4]),
        total_bytes_sent: parseInt(metaDataTransfer[dtInd][5])
      })
    }

    return models.GuardianMetaDataTransfer.bulkCreate(dbMetaDataTransfer)
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
    return models.GuardianMetaHardware
      .findOrCreate({
        where: { guardian_id: guardianId }
      })
      .spread((dbMetaHardware, wasCreated) => {
        if (metaDevice.android != null) {
          dbMetaHardware.manufacturer = metaDevice.android.manufacturer
          dbMetaHardware.brand = metaDevice.android.brand
          dbMetaHardware.model = metaDevice.android.model
          dbMetaHardware.product = metaDevice.android.product
          dbMetaHardware.android_version = metaDevice.android.android
          dbMetaHardware.android_build = metaDevice.android.build
        }

        if (metaDevice.phone != null) {
          dbMetaHardware.phone_imsi = (metaDevice.phone.imsi != null) ? metaDevice.phone.imsi : null
          dbMetaHardware.phone_imei = (metaDevice.phone.imei != null) ? metaDevice.phone.imei : null
          dbMetaHardware.phone_sim_serial = (metaDevice.phone.sim != null) ? metaDevice.phone.sim : null
          dbMetaHardware.phone_sim_number = (metaDevice.phone.number != null) ? metaDevice.phone.number : null
          dbMetaHardware.phone_sim_carrier = (metaDevice.phone.carrier != null) ? metaDevice.phone.carrier : null
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

    return models.GuardianMetaMqttBrokerConnection.bulkCreate(dbMetaBrokerConnection)
  },

  Storage: function (metaDiskUsage, guardianId, checkInId) {
    const diskUsage = { internal: {}, external: {} }

    for (const duInd in metaDiskUsage) {
      diskUsage[metaDiskUsage[duInd][0]] = {
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

    return models.GuardianMetaDiskUsage.bulkCreate(dbMetaDiskUsage)
  },

  Memory: function (metaMemory, guardianId, checkInId) {
    const memory = { system: {} }

    for (const mInd in metaMemory) {
      memory[metaMemory[mInd][0]] = {
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

    return models.GuardianMetaMemory.bulkCreate(dbMetaMemory)
  },

  SentinelPower: function (metaSntnlPwr, guardianId, checkInId) {
    const sntnlPwrEntries = { }

    for (const duInd in metaSntnlPwr) {
      const sysInpBatt = metaSntnlPwr[duInd][0] + ''
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

    return models.GuardianMetaSentinelPower.bulkCreate(dbMetaSentinelPower)
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
      dbMetaCheckInStatusObj[metaCheckInStatus[vInd][0] + '_count'] = parseInt(metaCheckInStatus[vInd][1])
      if (metaCheckInStatus[vInd][2] != null) {
        dbMetaCheckInStatusObj[metaCheckInStatus[vInd][0] + '_size_bytes'] = parseInt(metaCheckInStatus[vInd][2])
      }
    }
    dbMetaCheckInStatus.push(dbMetaCheckInStatusObj)

    return models.GuardianMetaCheckInStatus.bulkCreate(dbMetaCheckInStatus)
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
      roleVersions[roleArr[vInd][0]] = roleArr[vInd][1]
      const prom = models.GuardianSoftware
        .findOne({
          where: { role: roleArr[vInd][0] }
        })
        .then((dbSoftwareRole) => {
          if (!dbSoftwareRole) {
            return Promise.reject(`Role "${roleArr[vInd][0]}" was not found.`) // eslint-disable-line prefer-promise-reject-errors
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
                  .spread((dbSoftwareRoleVersionInsertion, wasCreatedInsertion) => {
                    dbSoftwareRoleVersionInsertion.updated_at = new Date()
                    return dbSoftwareRoleVersionInsertion.save()
                  })
              } else {
                return models.GuardianMetaSoftwareVersion
                  .findOrCreate({
                    where: { guardian_id: guardianId, software_id: dbSoftwareRole.id, version_id: dbSoftwareRoleVersion[0].id }
                  })
                  .spread((dbMetaSoftware, wasCreated) => {
                    dbMetaSoftware.updated_at = new Date()
                    return dbMetaSoftware.save()
                  })
              }
            })
        })
      proms.push(prom)
    }
    return Promise.all(proms)
  }

}

exports.models = {

  guardian: function (req, res, dbGuardian) {
    if (!Array.isArray(dbGuardian)) { dbGuardian = [dbGuardian] }

    const jsonArray = []

    for (const i in dbGuardian) {
      const dbRow = dbGuardian[i]

      const guardian = {
        guid: dbRow.guid,
        project_id: dbRow.project_id,
        timezone: dbRow.timezone,
        stream_id: dbRow.stream_id,
        shortname: dbRow.shortname,
        is_certified: dbRow.is_certified,
        is_visible: dbRow.is_visible,
        is_updatable: dbRow.is_updatable,
        carrier: {
          name: dbRow.carrier_name,
          number: dbRow.phone_number
        },
        cartodb_coverage_id: dbRow.cartodb_coverage_id,
        location: {
          latitude: parseFloat(dbRow.latitude),
          longitude: parseFloat(dbRow.longitude)
        },
        software: [],
        checkins: {
          guardian: {
            count: dbRow.check_in_count,
            last_checkin_at: dbRow.last_check_in
          },
          updater: {
            count: dbRow.update_check_in_count,
            last_checkin_at: dbRow.last_update_check_in
          }
        },
        last_sync: dbRow.last_ping ? dbRow.last_ping : null,
        battery_percent: dbRow.last_battery_main,
        battery_percent_internal: dbRow.last_battery_internal,
        site: dbRow.Site
          ? {
              guid: dbRow.Site.guid,
              name: dbRow.Site.name
            }
          : null,
        last_audio: dbRow.last_audio_sync ? { measured_at: dbRow.last_audio_sync } : null,
        notes: dbRow.notes || null,
        phone_imei: dbRow.phone_imei || null,
        phone_sim_number: dbRow.phone_sim_number || null,
        phone_sim_serial: dbRow.phone_sim_serial || null,
        last_deployed: dbRow.last_deployed
      }

      jsonArray.push(guardian)
    }
    return jsonArray
  },

  guardianPublicInfo: function (dbGuardian) {
    if (!Array.isArray(dbGuardian)) { dbGuardian = [dbGuardian] }

    const jsonArray = []

    for (const i in dbGuardian) {
      const dbRow = dbGuardian[i]

      const guardian = {
        guid: dbRow.guid,
        shortname: dbRow.shortname,
        site_name: dbRow.Site.name,
        site_description: dbRow.Site.description,
        timezone: dbRow.Site.timezone
      }

      jsonArray.push(guardian)
    }
    return jsonArray
  }

}

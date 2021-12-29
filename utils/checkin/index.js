function abbreviatedToFullName (checkInObj) {
  const json = checkInObj.json
  const { dt, c, btt, nw, str, mm, bc, dtt, sw, chn, sp, dv, ma, msg, mid, did, p, pf, ...others } = json
  const fullNameJson = { data_transfer: dt, cpu: c, battery: btt, network: nw, storage: str, memory: mm, broker_connections: bc, detections: dtt, software: sw, checkins: chn, sentinel_power: sp, device: dv, measured_at: ma, messages: msg, meta_ids: mid, detection_ids: did, purged: p, prefs: abbreviatedPrefsToFullName(pf), ...others }
  checkInObj.json = fullNameJson
  return checkInObj
}

function abbreviatedPrefsToFullName (prefsObj) {
  if (!prefsObj) {
    return prefsObj
  }
  const { s, v, ...others } = prefsObj
  const fullNamePrefs = { sha1: s, vals: v, ...others }
  return fullNamePrefs
}

module.exports = {
  abbreviatedToFullName
}

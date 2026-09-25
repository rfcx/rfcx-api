// HIDDEN-project cover images (rfcx-local 2026-09-25, operator GO 00:17/00:19).
//
// arbimon-profile holds project covers under `projects/<locationProjectId>/...`
// and user avatars under `users/...`. The /images resize route is public by
// design, so until now a HIDDEN project's cover (status = 'hidden' in
// insights.location_project -- the only non-public status: listed / unlisted /
// published are all viewable by anyone with the link) was served to anyone
// holding its URL, CF-cached for 7 days.
//
// Now: for a `projects/<id>/` key whose project is hidden, the route REQUIRES
// a signature minted by arbimon-api (which only emits it on surfaces that have
// already authorised the viewer):
//
//   ?exp=<epoch seconds>&sig=<hex hmac-sha256(STREAM_TOKEN_SALT,
//                              `arbimon-image:${alias}:${key}:${exp}`)>
//
// exp is part of the signed message (extending it changes the required sig),
// fails CLOSED at exp <= now, malformed -> reject. Same salt, same expiry
// semantics as the stream-token (common/middleware/passport-stream-token).
//
// Visibility is read from insights with the core_api role, which holds ONLY
// CONNECT + SELECT(id, status) on public.location_project (rfcx-local
// data-stores/postgres-timescale/pg-grants-core-api-insights-status-2026-09-25.sql).
// Cached per project for STATUS_TTL_MS. FAIL CLOSED: if the status cannot be
// read, a projects/ key is treated as hidden (a signed URL still works; an
// unsigned one gets 403) -- never "serve it publicly because the DB was down".
const crypto = require('crypto')
const { Client } = require('pg')

const STATUS_TTL_MS = 5 * 60 * 1000
const PROJECT_KEY_RE = /^projects\/(\d+)\//

const statusCache = new Map() // id -> { hidden: bool, at: ms }
const MAX_CACHE = 20000

function projectIdOf (objectKey) {
  const m = PROJECT_KEY_RE.exec(objectKey || '')
  return m ? Number(m[1]) : null
}

function signImage (alias, key, exp) {
  const salt = process.env.STREAM_TOKEN_SALT
  if (!salt || !Number.isInteger(exp)) { return null }
  return crypto.createHmac('sha256', salt).update(`arbimon-image:${alias}:${key}:${exp}`, 'utf8').digest('hex')
}

function verifyImageSignature (alias, key, expRaw, sigRaw, nowMs) {
  if (typeof sigRaw !== 'string' || !/^[0-9a-f]{64}$/.test(sigRaw)) { return false }
  if (!/^\d+$/.test(`${expRaw}`)) { return false }
  const exp = Number(expRaw)
  if (!Number.isInteger(exp) || exp * 1000 <= (nowMs === undefined ? Date.now() : nowMs)) { return false }
  const want = signImage(alias, key, exp)
  if (!want) { return false }
  const a = Buffer.from(want, 'utf8'); const b = Buffer.from(sigRaw, 'utf8')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// Injectable for tests; production reads insights with the core_api role.
let statusReader = async (id) => {
  const client = new Client({
    host: process.env.POSTGRES_HOSTNAME,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.INSIGHTS_DB_NAME || 'insights',
    ssl: process.env.POSTGRES_SSL_ENABLED === 'true' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 3000,
    statement_timeout: 3000
  })
  await client.connect()
  try {
    const r = await client.query('SELECT status FROM public.location_project WHERE id = $1', [id])
    return r.rows.length ? r.rows[0].status : null
  } finally {
    await client.end().catch(() => {})
  }
}

async function isHiddenProject (id, nowMs) {
  const now = nowMs === undefined ? Date.now() : nowMs
  const c = statusCache.get(id)
  if (c && now - c.at < STATUS_TTL_MS) { return c.hidden }
  let hidden
  try {
    const status = await statusReader(id)
    hidden = status === 'hidden' // unknown project id -> not hidden (object lookup will 404 anyway)
  } catch (err) {
    console.error('private-image: status lookup failed, failing CLOSED', id, err && err.message)
    return true // do NOT cache a failure
  }
  if (statusCache.size >= MAX_CACHE) { statusCache.clear() }
  statusCache.set(id, { hidden, at: now })
  return hidden
}

/**
 * @returns {Promise<{ needsSignature: boolean, authorized: boolean }>}
 *   needsSignature -- the object belongs to a hidden project (or status unknown)
 *   authorized     -- may be served (public object, or a valid signature)
 */
async function checkImageAccess (alias, objectKey, query, nowMs) {
  const id = projectIdOf(objectKey)
  if (id === null) { return { needsSignature: false, authorized: true } } // users/..., etc.: public by design
  const q = query || {}
  // A valid signature is sufficient on its own -- no DB round-trip for signed requests.
  if (q.sig !== undefined || q.exp !== undefined) {
    if (verifyImageSignature(alias, objectKey, q.exp, q.sig, nowMs)) { return { needsSignature: true, authorized: true } }
  }
  const hidden = await isHiddenProject(id, nowMs)
  return { needsSignature: hidden, authorized: !hidden }
}

module.exports = {
  checkImageAccess,
  verifyImageSignature,
  signImage,
  projectIdOf,
  STATUS_TTL_MS,
  __setStatusReader: (fn) => { statusReader = fn },
  __clearCache: () => statusCache.clear()
}

// End-to-end verification of the resize ROUTE (not just the resize module),
// exercised against REAL objects in the live arbimon-profile bucket.
//
// The module tests prove the conversion is correct. This proves the plumbing:
// param validation, bucket-alias whitelisting, cache-key construction, the
// miss -> fetch -> convert -> serve path, and the fire-and-forget writeback.
//
// Storage is stubbed at the storageService boundary so this can run in-pod
// WITHOUT writing to any bucket (source bytes are fetched over the in-cluster
// s3-proxy exactly as the real code would). Nothing here mutates live storage.
//
// Usage (in-pod): node /tmp/rzt/verify-route.js

const http = require('http')
const Module = require('module')
const { PassThrough } = require('stream')

const S3_PROXY = process.env.STREAMS_CACHE_S3_ENDPOINT || 'http://s3-proxy.edge.svc.cluster.local:8080'

let pass = 0
let fail = 0
const failures = []
function check (name, cond, detail) {
  if (cond) { pass++; console.log(`  ok   ${name}`) } else {
    fail++; failures.push(`${name}${detail ? ` -- ${detail}` : ''}`)
    console.log(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`)
  }
}

// ---- fake storage layer -----------------------------------------------------
const cache = new Map() // cacheKey -> Buffer (simulated cache bucket)
const writebacks = [] // record fire-and-forget PUTs
let sourceFetches = 0

function fetchFromProxy (bucket, key) {
  return new Promise((resolve) => {
    const url = `${S3_PROXY}/${bucket}/${encodeURI(key)}`
    http.get(url, (res) => {
      if (res.statusCode !== 200) { res.resume(); resolve(null); return }
      resolve(res)
    }).on('error', () => resolve(null))
  })
}

const fakeStorage = {
  buckets: { mediaCacheImage: 'rfcx-media-api-cache-image' },
  async getObjectStreamOrNull (bucket, key) {
    if (bucket === 'rfcx-media-api-cache-image') {
      if (!cache.has(key)) { return null }
      const s = new PassThrough(); s.end(cache.get(key)); return s
    }
    sourceFetches++
    return await fetchFromProxy(bucket, key)
  },
  async uploadBuffer (bucket, key, buffer) {
    writebacks.push({ bucket, key, bytes: buffer.length })
    cache.set(key, buffer)
    return {}
  }
}

// Intercept the storage require so the route uses our stub.
const origLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request.endsWith('_services/storage')) {
    return fakeStorage
  }
  return origLoad.apply(this, arguments)
}

process.env.MEDIA_CACHE_ENABLED = 'true'
process.env.ARBIMON_PROFILE_BUCKET = 'arbimon-profile'

const router = require(process.env.RZ_ROUTE_PATH || './images')

// ---- minimal express-ish harness --------------------------------------------
// Invoke the router's single layer directly with fake req/res objects.
function callRoute ({ bucket, key, query = {} }) {
  return new Promise((resolve) => {
    const req = {
      method: 'GET',
      url: `/images/${bucket}/${key}`,
      params: { bucket, 0: key },
      query,
      rfcx: { auth_token_info: { id: 'test', is_super: true } }
    }
    const chunks = []
    const headers = {}
    let statusCode = 200
    let finished = false
    const done = () => { if (!finished) { finished = true; resolve({ statusCode, headers, body: Buffer.concat(chunks) }) } }
    const res = {
      setHeader: (k, v) => { headers[k.toLowerCase()] = v },
      getHeader: (k) => headers[k.toLowerCase()],
      removeHeader: (k) => { delete headers[k.toLowerCase()] },
      status (c) { statusCode = c; return this },
      json (o) { chunks.push(Buffer.from(JSON.stringify(o))); done(); return this },
      send (b) { chunks.push(Buffer.isBuffer(b) ? b : Buffer.from(String(b))); done(); return this },
      end (b) { if (b) { chunks.push(Buffer.isBuffer(b) ? b : Buffer.from(String(b))) } done() },
      on () {},
      once () {},
      emit () {},
      write (b) { chunks.push(Buffer.isBuffer(b) ? b : Buffer.from(String(b))); return true }
    }
    // support cacheStream.pipe(res)
    res.writable = true
    const origHandle = router.handle.bind(router)
    origHandle(req, res, (err) => {
      if (err) { statusCode = err.status || 500; chunks.push(Buffer.from(String(err.message || err))) }
      done()
    })
    setTimeout(done, 20000)
  })
}

const REAL_KEY = 'projects/10/project-profile-image-3329ef68.png' // 200, 938,665 B
const NO_THUMB_KEY = REAL_KEY // its .thumbnail. sidecar 404s

async function main () {
  console.log('-- validation (no storage touched) --')
  let r = await callRoute({ bucket: 'nope', key: REAL_KEY, query: { w: '144' } })
  check('unknown bucket alias rejected', r.statusCode >= 400 && r.statusCode < 500, `status=${r.statusCode}`)

  r = await callRoute({ bucket: 'arbimon-profile', key: REAL_KEY, query: {} })
  check('missing w rejected', r.statusCode >= 400 && r.statusCode < 500, `status=${r.statusCode}`)

  r = await callRoute({ bucket: 'arbimon-profile', key: REAL_KEY, query: { w: '99999' } })
  check('over-ceiling w rejected', r.statusCode >= 400 && r.statusCode < 500, `status=${r.statusCode}`)

  r = await callRoute({ bucket: 'arbimon-profile', key: REAL_KEY, query: { w: '144', f: 'gif' } })
  check('bad format rejected', r.statusCode >= 400 && r.statusCode < 500, `status=${r.statusCode}`)

  r = await callRoute({ bucket: 'arbimon-profile', key: '../etc/passwd', query: { w: '144' } })
  check('path traversal rejected', r.statusCode >= 400 && r.statusCode < 500, `status=${r.statusCode}`)

  console.log('\n-- MISS path against the REAL bucket --')
  cache.clear(); writebacks.length = 0; sourceFetches = 0
  const t0 = Date.now()
  r = await callRoute({ bucket: 'arbimon-profile', key: REAL_KEY, query: { w: '144' } })
  const missMs = Date.now() - t0
  check('miss returns 200', r.statusCode === 200, `status=${r.statusCode} body=${r.body.slice(0, 120).toString()}`)
  check('miss served webp by default', r.headers['content-type'] === 'image/webp', r.headers['content-type'])
  check('miss marked X-Rfcx-Image-Cache: MISS', r.headers['x-rfcx-image-cache'] === 'MISS', r.headers['x-rfcx-image-cache'])
  check('explicit Cache-Control set (not CF default)', /max-age=604800/.test(r.headers['cache-control'] || ''), r.headers['cache-control'])
  check('output is dramatically smaller than the 938KB original', r.body.length > 0 && r.body.length < 30000, `${r.body.length} bytes in ${missMs}ms`)
  check('source fetched exactly once', sourceFetches === 1, String(sourceFetches))
  check('writeback fired (fire-and-forget)', writebacks.length === 1, JSON.stringify(writebacks))
  check('writeback key is quantised + namespaced', /^arbimon-profile\/144x144\/webp\//.test(writebacks[0] ? writebacks[0].key : ''), writebacks[0] && writebacks[0].key)

  console.log('\n-- HIT path --')
  const beforeFetches = sourceFetches
  const t1 = Date.now()
  r = await callRoute({ bucket: 'arbimon-profile', key: REAL_KEY, query: { w: '144' } })
  const hitMs = Date.now() - t1
  check('hit returns 200', r.statusCode === 200, `status=${r.statusCode}`)
  check('hit marked X-Rfcx-Image-Cache: HIT', r.headers['x-rfcx-image-cache'] === 'HIT', r.headers['x-rfcx-image-cache'])
  check('hit did NOT refetch the source', sourceFetches === beforeFetches, `${beforeFetches} -> ${sourceFetches}`)
  check('hit is fast', hitMs < missMs, `hit=${hitMs}ms miss=${missMs}ms`)

  console.log('\n-- quantisation collapses neighbouring requests onto ONE key --')
  const keysBefore = new Set(cache.keys()).size
  for (const w of ['129', '134', '140', '144']) {
    await callRoute({ bucket: 'arbimon-profile', key: REAL_KEY, query: { w } })
  }
  check('4 nearby widths added no new cache keys', new Set(cache.keys()).size === keysBefore, `${keysBefore} -> ${new Set(cache.keys()).size}`)

  console.log('\n-- the 11.3% case: an image with NO pre-baked thumbnail --')
  // This is the entire justification for the endpoint: the .thumbnail. sidecar
  // for this object 404s, but resize-on-demand serves it anyway.
  const sidecar = NO_THUMB_KEY.replace(/\.png$/, '.thumbnail.png')
  const sidecarProbe = await fetchFromProxy('arbimon-profile', sidecar)
  check('pre-baked sidecar genuinely 404s (the defect being fixed)', sidecarProbe === null, sidecarProbe ? 'unexpectedly present' : '404 confirmed')
  r = await callRoute({ bucket: 'arbimon-profile', key: NO_THUMB_KEY, query: { w: '144', f: 'jpg' } })
  check('endpoint serves a thumbnail anyway', r.statusCode === 200 && r.body.length > 0, `status=${r.statusCode} bytes=${r.body.length}`)

  console.log('\n-- PUBLIC-MOUNT contract: refresh must NOT be honoured --')
  // This route is mounted outside authenticate(), and the explorer.rfcx.org
  // edge block forwards $args VERBATIM (no refresh-stripping if-chain, unlike
  // the arbimon.org + demo blocks). So a client-supplied refresh MUST be inert
  // in the app itself, or it is an unauthenticated CPU/DoS amplifier.
  cache.clear(); writebacks.length = 0; sourceFetches = 0
  await callRoute({ bucket: 'arbimon-profile', key: REAL_KEY, query: { w: '144' } })
  const fetchesAfterWarm = sourceFetches
  r = await callRoute({ bucket: 'arbimon-profile', key: REAL_KEY, query: { w: '144', refresh: 'true' } })
  check('refresh=true still served from cache (HIT)', r.headers['x-rfcx-image-cache'] === 'HIT', r.headers['x-rfcx-image-cache'])
  check('refresh=true did NOT re-fetch the source', sourceFetches === fetchesAfterWarm, `${fetchesAfterWarm} -> ${sourceFetches}`)
  check('refresh=true minted no extra cache key', cache.size === 1, `${cache.size} keys`)
  for (const variant of ['TRUE', '1', 'yes']) {
    const rr = await callRoute({ bucket: 'arbimon-profile', key: REAL_KEY, query: { w: '144', refresh: variant } })
    check(`refresh=${variant} also inert`, rr.headers['x-rfcx-image-cache'] === 'HIT', rr.headers['x-rfcx-image-cache'])
  }

  console.log('\n-- missing source -> 404 (not 500) --')
  r = await callRoute({ bucket: 'arbimon-profile', key: 'projects/999999/does-not-exist.png', query: { w: '144' } })
  check('absent source returns 404', r.statusCode === 404, `status=${r.statusCode}`)

  console.log('\n-- format + size matrix on the real object --')
  for (const f of ['webp', 'jpg', 'png']) {
    for (const w of ['144', '304', '608']) {
      const rr = await callRoute({ bucket: 'arbimon-profile', key: REAL_KEY, query: { w, f } })
      check(`w=${w} f=${f} -> 200`, rr.statusCode === 200 && rr.body.length > 0, `status=${rr.statusCode} bytes=${rr.body.length}`)
    }
  }

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
  if (fail > 0) { console.log('FAILURES:'); failures.forEach(f => console.log(`  - ${f}`)) }
  console.log(`\n(cache keys minted: ${cache.size}; source fetches: ${sourceFetches}; writebacks: ${writebacks.length})`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2) })

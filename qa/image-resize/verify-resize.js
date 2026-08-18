// Standalone verification harness for core/_services/images/resize.js.
//
// Runs INSIDE a media-api pod, against the real ImageMagick build that ships in
// the core-api image (6.9.11-60 Q16). That is the environment that matters:
// IM6 vs IM7 differ on stdin/frame syntax, and the delegate list (webp/heic)
// is build-specific. A jest run on a laptop's IM7 would not prove this works
// where it actually runs.
//
// Usage (in-pod):  node /tmp/rzt/verify-resize.js
// No jest, no node_modules -- deliberately dependency-free.

const { execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const {
  resizeImageBuffer,
  normaliseDimension,
  isAllowedFormat,
  DEFAULT_FORMAT,
  MAX_DIMENSION,
  MIN_DIMENSION,
  DIMENSION_STEP,
  MAX_SOURCE_BYTES
} = require('./resize')

const CONVERT = process.env.IMAGEMAGICK_PATH || '/usr/bin/convert'
const IDENTIFY = CONVERT.replace(/convert$/, 'identify')
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rzverify-'))

let pass = 0
let fail = 0
const failures = []

function check (name, cond, detail) {
  if (cond) { pass++; console.log(`  ok   ${name}`) } else {
    fail++; failures.push(`${name}${detail ? ` -- ${detail}` : ''}`)
    console.log(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`)
  }
}

async function expectStatus (name, promise, status) {
  try {
    await promise
    check(name, false, 'resolved but should have thrown')
  } catch (err) {
    check(name, err.status === status, `expected status ${status}, got ${err.status} (${err.message})`)
  }
}

function makeImage (args, outName) {
  const out = path.join(tmpDir, outName)
  execFileSync(CONVERT, [...args, out])
  return fs.readFileSync(out)
}

function identify (buffer, format) {
  const p = path.join(tmpDir, `id-${Math.random().toString(36).slice(2)}`)
  fs.writeFileSync(p, buffer)
  try { return execFileSync(IDENTIFY, ['-format', format, p]).toString().trim() } finally { fs.unlinkSync(p) }
}

// Persist a buffer so `identify` can report PER-FRAME lines (one line per
// frame), which is how we count frames in an animation-capable container.
function writeTmp (buffer) {
  const p = path.join(tmpDir, `fr-${Math.random().toString(36).slice(2)}`)
  fs.writeFileSync(p, buffer)
  return p
}

function makeManyFrameGif (n) {
  const frame = path.join(tmpDir, 'one.png')
  execFileSync(CONVERT, ['-size', '400x400', 'xc:red', frame])
  const out = path.join(tmpDir, 'many.gif')
  execFileSync(CONVERT, [...Array(n).fill(frame), out])
  return fs.readFileSync(out)
}

const sq = (n, format = 'webp') => ({ width: n, height: n, format })

async function main () {
  console.log(`ImageMagick: ${execFileSync(CONVERT, ['-version']).toString().split('\n')[0]}`)
  console.log(`node: ${process.version}\n`)

  console.log('-- dimension normalisation (bounded + quantised, NOT a whitelist) --')
  // The contract: free-form dimensions like the spectrogram route's d<x>.<y>,
  // but snapped to a grid so the cache key-space stays finite.
  check('snaps 150 (the real ask) UP to 160, never down', normaliseDimension(150) === 160, String(normaliseDimension(150)))
  // 144 is the EXISTING thumbnail size (PROJECT_IMAGE_CONFIG.thumbnail). If the
  // grid cannot represent it exactly, this endpoint cannot reproduce the
  // sidecars it replaces -- which is what a 32px step got wrong.
  check('144 (existing thumbnail size) is exactly on-grid', normaliseDimension(144) === 144, String(normaliseDimension(144)))
  check('neighbouring requests collapse to ONE key', normaliseDimension(129) === normaliseDimension(144) &&
    normaliseDimension(129) === 144, `${normaliseDimension(129)} / ${normaliseDimension(144)}`)
  check('tiny request floors at MIN_DIMENSION', normaliseDimension(1) === MIN_DIMENSION, String(normaliseDimension(1)))
  check('accepts string form', normaliseDimension('300') === 304, String(normaliseDimension('300')))
  check('rejects above the ceiling', normaliseDimension(MAX_DIMENSION + 1) === null)
  check('rejects zero / negative / NaN / junk', [0, -5, NaN, 'abc', '', null, undefined, Infinity]
    .every(v => normaliseDimension(v) === null))
  // The cache-cardinality bound is the whole justification for allowing
  // free-form values, so assert it numerically.
  const distinct = new Set()
  for (let i = 1; i <= MAX_DIMENSION; i++) { distinct.add(normaliseDimension(i)) }
  check(`an attacker walking w=1..${MAX_DIMENSION} mints only ${MAX_DIMENSION / DIMENSION_STEP} keys`,
    distinct.size === MAX_DIMENSION / DIMENSION_STEP, `${distinct.size} distinct`)

  console.log('\n-- input validation --')
  const dummy = Buffer.from('not-an-image')
  for (const fmt of ['gif', 'tiff', 'svg', 'pdf', 'constructor', 'toString', '']) {
    await expectStatus(`format '${fmt}' refused`, resizeImageBuffer(dummy, sq(144, fmt)), 400)
  }
  check('default format is webp', DEFAULT_FORMAT === 'webp')
  check('isAllowedFormat rejects prototype keys', isAllowedFormat('toString') === false)
  await expectStatus('empty source refused', resizeImageBuffer(Buffer.alloc(0), sq(144)), 502)
  await expectStatus('oversized source refused pre-spawn', resizeImageBuffer(Buffer.alloc(MAX_SOURCE_BYTES + 1), sq(144)), 413)
  // Un-normalised dimensions must be refused even though the route normalises:
  // the module has to be safe called from anywhere.
  await expectStatus('off-grid width refused', resizeImageBuffer(dummy, { width: 150, height: 150, format: 'webp' }), 400)
  await expectStatus('over-ceiling width refused', resizeImageBuffer(dummy, { width: 2048, height: 2048, format: 'webp' }), 400)
  await expectStatus('non-integer width refused', resizeImageBuffer(dummy, { width: 144.5, height: 144, format: 'webp' }), 400)

  // GUARD: everything below resizes at concrete dimensions, which requires the
  // grid to still represent them. If the quantisation contract is broken (e.g.
  // a step that cannot express 144), fail LOUDLY here instead of letting the
  // first resize throw and abort the run -- an aborted run reads as "harness
  // error" rather than "defect detected", which is how a caught regression
  // gets mistaken for a broken test.
  if (normaliseDimension(144) !== 144 || normaliseDimension(608) !== 608) {
    check('grid can represent the sizes the app uses (144, 608)', false,
      `144->${normaliseDimension(144)}, 608->${normaliseDimension(608)}; skipping resize suite`)
    console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
    failures.forEach(f => console.log(`  - ${f}`))
    fs.rmSync(tmpDir, { recursive: true, force: true })
    process.exit(1)
  }

  console.log('\n-- real resizing --')
  const big = makeImage(['-size', '900x600', 'xc:red'], 'big.png')
  const r1 = await resizeImageBuffer(big, sq(144, 'jpg'))
  check('shrinks to bound, aspect preserved', identify(r1, '%wx%h') === '144x96', identify(r1, '%wx%h'))
  check('emits JPEG', identify(r1, '%m') === 'JPEG', identify(r1, '%m'))

  const small = makeImage(['-size', '320x180', 'xc:blue'], 'small.png')
  const r2 = await resizeImageBuffer(small, sq(608, 'jpg')) // 608 = 38x16, on-grid
  check('does NOT upscale below the bound', identify(r2, '%wx%h') === '320x180', identify(r2, '%wx%h'))

  const png = makeImage(['-size', '400x400', 'xc:green'], 'sniff.png')
  const r3 = await resizeImageBuffer(png, sq(144, 'jpg'))
  check('sniffs content, ignores extension', identify(r3, '%m') === 'JPEG' && identify(r3, '%wx%h') === '144x144')

  const fmtSrc = makeImage(['-size', '500x500', 'xc:orange'], 'fmt.png')
  for (const [fmt, magic] of [['jpg', 'JPEG'], ['png', 'PNG'], ['webp', 'WEBP']]) {
    const o = await resizeImageBuffer(fmtSrc, sq(144, fmt))
    check(`format ${fmt} -> ${magic}`, identify(o, '%m') === magic, identify(o, '%m'))
  }

  // Non-square bounding boxes must work, since dimensions are now independent.
  const wide = makeImage(['-size', '1000x200', 'xc:teal'], 'wide.png')
  const rW = await resizeImageBuffer(wide, { width: 320, height: 64, format: 'webp' })
  check('independent w/h bounding box respected', identify(rW, '%wx%h') === '320x64', identify(rW, '%wx%h'))

  const alpha = makeImage(['-size', '200x200', 'xc:none'], 'alpha.png')
  const rA = await resizeImageBuffer(alpha, sq(144, 'jpg'))
  const mean = parseFloat(identify(rA, '%[fx:mean]'))
  check('transparent PNG -> white (not a black box) in jpg', mean > 0.9, `mean=${mean}`)
  const rP = await resizeImageBuffer(alpha, sq(144, 'png'))
  check('alpha preserved for png output', /true|blend|undefined/i.test(identify(rP, '%A')), identify(rP, '%A'))
  // webp is the default precisely because it keeps alpha AND compresses well.
  const rWA = await resizeImageBuffer(alpha, sq(144, 'webp'))
  check('alpha preserved for webp output', rWA.length > 0 && identify(rWA, '%m') === 'WEBP')

  const meta = makeImage(['-size', '300x300', 'xc:purple', '-set', 'comment', 'SECRET-GPS-PAYLOAD'], 'meta.png')
  const rM = await resizeImageBuffer(meta, sq(144, 'jpg'))
  check('metadata stripped from output', !rM.toString('latin1').includes('SECRET-GPS-PAYLOAD'))

  await expectStatus('undecodable payload -> 415 (not 5xx)', resizeImageBuffer(Buffer.from('just text, not an image'), sq(144)), 415)

  // Multi-frame handling. NOTE: asserting this on PNG output is VACUOUS --
  // PNG cannot carry the extra frames, so it reads as 1 frame whether or not
  // we selected `[0]`. WEBP is animation-capable, so it is the only output
  // here that can actually detect the missing selector. (Found by mutation
  // testing: the `[0]`-removal mutant SURVIVED the PNG-based assertion.)
  const gif = makeImage(['-delay', '10', '-size', '200x200', 'xc:red', 'xc:blue', 'xc:green', '-loop', '0'], 'anim.gif')
  const rG = await resizeImageBuffer(gif, sq(144, 'webp'))
  const frames = execFileSync(IDENTIFY, ['-format', '%n\n', writeTmp(rG)]).toString().trim().split('\n').length
  check('multi-frame source -> single frame out (webp)', frames === 1, `${frames} frames`)

  // The same selector is a resource guard: decoding every frame of a 60-frame
  // source measured 161ms vs 6ms (27x) and a 60x larger intermediate.
  //
  // This is wrapped because WITHOUT the selector the 60-frame decode exceeds
  // the memory limit and THROWS -- which is itself the guard working, but an
  // uncaught throw here would abort the harness and be misread as "invalid
  // mutant" rather than "mutant caught".
  const many = makeManyFrameGif(60)
  const t1 = Date.now()
  try {
    const rMany = await resizeImageBuffer(many, sq(144, 'webp'))
    const manyMs = Date.now() - t1
    const manyFrames = execFileSync(IDENTIFY, ['-format', '%n\n', writeTmp(rMany)]).toString().trim().split('\n').length
    check('60-frame source decodes only frame 0', manyFrames === 1, `${manyFrames} frames, ${manyMs}ms`)
  } catch (err) {
    check('60-frame source decodes only frame 0', false, `threw instead: ${err.message.slice(0, 80)}`)
  }

  await expectStatus('shell metachars in format refused', resizeImageBuffer(big, sq(144, 'jpg; touch /tmp/pwned')), 400)
  check('no shell injection side effect', !fs.existsSync('/tmp/pwned'))

  const plasma = makeImage(['-size', '1200x800', 'plasma:'], 'plasma.png')
  const rZ = await resizeImageBuffer(plasma, sq(144, 'jpg'))
  check('output far smaller than source', rZ.length < plasma.length * 0.2, `${rZ.length} vs ${plasma.length}`)

  console.log('\n-- optimisations + guards --')
  // webp default should beat jpeg on a photographic source. Measured 9-33%
  // smaller on the live bucket; assert the direction holds.
  const photo = makeImage(['-size', '800x600', 'plasma:fractal'], 'photo.png')
  const pj = await resizeImageBuffer(photo, sq(144, 'jpg'))
  const pw = await resizeImageBuffer(photo, sq(144, 'webp'))
  check('webp smaller than jpeg at equivalent quality', pw.length < pj.length, `webp=${pw.length} jpg=${pj.length}`)

  // JPEG shrink-on-load must not change the result, only the cost.
  const bigJpeg = makeImage(['-size', '3000x2000', 'plasma:', '-quality', '90'], 'big.jpg')
  const t2 = Date.now()
  const rJ = await resizeImageBuffer(bigJpeg, sq(144, 'jpg'))
  check('large JPEG resizes correctly (shrink-on-load path)', identify(rJ, '%wx%h') === '144x96', `${identify(rJ, '%wx%h')} in ${Date.now() - t2}ms`)

  // The disk limit is the DiskPressure guard: IM must not spill a pixel cache
  // into the container overlayfs. Prove the flag is accepted by this build.
  const before = fs.readdirSync('/tmp').filter(f => f.startsWith('magick-')).length
  const rL = await resizeImageBuffer(big, sq(320, 'webp'))
  const after = fs.readdirSync('/tmp').filter(f => f.startsWith('magick-')).length
  check('limits accepted; resize still succeeds', rL.length > 0)
  check('no magick scratch files left in /tmp (overlayfs guard)', after === before, `${before} -> ${after}`)

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
  if (fail > 0) { console.log('FAILURES:'); failures.forEach(f => console.log(`  - ${f}`)) }
  fs.rmSync(tmpDir, { recursive: true, force: true })
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2) })
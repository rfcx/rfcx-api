const Promise = require('bluebird')
const fs = require('fs')

exports.audioUtils = {

  /**
   * Stream a file to the response, then delete it.
   *
   * 🔴 SETTLES EXACTLY ONCE ON EVERY TERMINAL PATH (rfcx-local, 2026-08-23).
   *
   * The previous version settled on only TWO paths -- `fs.stat` failing, and the
   * read stream reaching `end`. It had no handler for a stream `error` and none
   * for the client going away, so on either of those the returned promise
   * NEVER SETTLED and the temp file was NEVER UNLINKED.
   *
   * WHY THIS WAS NOT THEORETICAL. The never-settles case was the root cause of
   * the 2026-08-23 render-slot leak (rfcx-api #673): getFile() wrapped
   * generateFile() in try/finally, generateFile() awaited THIS function, and a
   * client disconnect meant the `finally` never ran -- so a media-api pod
   * wedged at inFlight=4/2 and shed every pre-warm request for 25+ minutes
   * while idle. #673 fixed that at the GATE by binding the slot to the response
   * lifecycle; this fixes the underlying helper.
   *
   * The temp-file half was measured the same day: aborting a burst against ONE
   * pod left 44 orphaned files in /tmp/ffmpeg and 0 on the other five. That
   * matters because CACHE_DIRECTORY is /tmp on the container filesystem (a
   * 30 GB overlay measured at 84% full), and media-api pods have previously
   * been Evicted under DiskPressure.
   *
   * DESIGN NOTES
   *  * A client abort RESOLVES, it does not reject: a client going away is not
   *    a server error, and three of the four call sites are
   *    `.catch(console.error)`, so rejecting would turn routine disconnects
   *    into error-log noise.
   *  * A stream `error` still REJECTS -- that is a genuine failure.
   *  * Cleanup is unconditional and idempotent; previously `unlink` lived only
   *    on the success path.
   *  * The `settled` guard mirrors the pattern already proven in
   *    core/_services/storage/amazon.js:getObjectStreamOrNull(), rather than
   *    inventing a second shape for the same problem.
   *  * On abort we must NOT touch `res` beyond removing listeners: headers are
   *    already written and the socket is gone.
   */
  serveAudioFromFile: function (res, filePathToServe, fileName, mimeType, inline, additionalHeaders) {
    return new Promise(function (resolve, reject) {
      let settled = false
      let cleanedUp = false
      let readStream = null

      const cleanup = function () {
        if (cleanedUp) {
          return
        }
        cleanedUp = true
        fs.unlink(filePathToServe, function (e) {
          // ENOENT is expected when another path already removed it.
          if (e && e.code !== 'ENOENT') { console.error(e) }
        })
      }

      const detach = function () {
        if (res && typeof res.removeListener === 'function') {
          res.removeListener('close', onClose)
        }
      }

      const settle = function (err) {
        if (settled) {
          return
        }
        settled = true
        detach()
        cleanup()
        if (err) { reject(err) } else { resolve(null) }
      }

      function onClose () {
        // Client went away (or the response finished and Node emitted 'close').
        // Either way the transfer is over: release the fd and settle so callers
        // relying on this promise cannot hang forever.
        if (readStream && typeof readStream.destroy === 'function') {
          readStream.destroy()
        }
        settle(null)
      }

      try {
        fs.stat(filePathToServe, function (statErr, audioFileStat) {
          if (statErr != null) {
            // Previously `reject(new Error())` -- an Error with NO MESSAGE, which
            // the callers log verbatim. Say what actually happened.
            console.warn(`Audio file not found: ${filePathToServe}`)
            settled = true
            reject(new Error(`Audio file not found: ${filePathToServe}`))
            return
          }

          const headers = {
            'Content-Type': mimeType,
            'Content-Length': audioFileStat.size,
            'Accept-Ranges': `bytes 0-${audioFileStat.size - 1}/${audioFileStat.size}`,
            'Content-Disposition': `attachment; filename=${fileName}`,
            'Cache-Control': 'max-age=600'
          }
          if (additionalHeaders) {
            for (const key in additionalHeaders) {
              headers[key] = additionalHeaders[key]
            }
          }

          // if we'd like to play audio in browser instead of downloading it
          if (inline) {
            delete headers['Content-Disposition']
          }

          res.writeHead(200, headers)

          if (res && typeof res.on === 'function') {
            res.on('close', onClose)
          }

          readStream = fs.createReadStream(filePathToServe)
          readStream
            .on('end', function () {
              res.end()
              settle(null)
            })
            .on('error', function (err) {
              // A read failure mid-transfer. Headers are already sent, so the
              // response cannot be recovered -- report it and let the socket close.
              console.error('failed to stream audio file | ' + (err && err.message))
              settle(err instanceof Error ? err : new Error(String(err)))
            })
            .pipe(res, { end: true })
        })
      } catch (err) {
        console.warn('failed to serve audio file | ' + err)
        settle(err instanceof Error ? err : new Error(String(err)))
      }
    })
  }

}

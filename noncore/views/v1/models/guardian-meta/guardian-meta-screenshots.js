const aws = require('../../../../_utils/external/aws.js').aws()
const assetUtils = require('../../../../_utils/internal-rfcx/asset-utils.js').assetUtils

exports.models = {

  guardianMetaScreenshots: function (req, res, dbScreenshots) {
    if (!Array.isArray(dbScreenshots)) { dbScreenshots = [dbScreenshots] }

    const jsonArray = []

    for (const i in dbScreenshots) {
      const dbRow = dbScreenshots[i]

      jsonArray.push({
        guid: dbRow.guid,
        captured_at: dbRow.captured_at,
        size: dbRow.size,
        sha1_checksum: dbRow.sha1_checksum,
        url: process.env.ASSET_URLBASE + '/screenshots/' + dbRow.guid + '.png'
      })
    }
    return jsonArray
  },

  guardianMetaScreenshotFile: function (req, res, dbRows) {
    const dbRow = dbRows

    // auto-generate the asset filepath if it's not stored in the url column
    const metaStoragePath = (dbRow.url == null)
      ? assetUtils.getGuardianAssetStoragePath('screenshots', dbRow.captured_at, dbRow.Guardian.guid, 'png')
      : dbRow.url.substr(dbRow.url.indexOf('://') + 3 + process.env.ASSET_BUCKET_AUDIO.length)

    aws.s3(process.env.ASSET_BUCKET_META).getFile(metaStoragePath, function (err, result) {
      if (err) { throw err }

      // this next line may not be necessary
      result.resume()

      const contentLength = parseInt(result.headers['content-length'])

      res.writeHead(200, {
        'Content-Length': contentLength,
        'Accept-Ranges': 'bytes 0-' + (contentLength - 1) + '/' + contentLength,
        'Content-Type': result.headers['content-type'],
        'Content-Disposition': 'filename=' + dbRow.guid + '.png'
      })

      result.pipe(res)
    })
  }

}

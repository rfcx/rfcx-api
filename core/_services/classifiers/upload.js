const storageService = process.env.PLATFORM === 'google' ? require('../storage/google') : require('../storage/amazon')
const { randomString } = require('../../../common/random/hash')

module.exports = {
  async upload (file) {
    const storageBucket = process.env.ASSET_BUCKET_AI
    const storagePath = `classifiers/${randomString(8)}.tar.gz`
    await storageService.upload(storageBucket, storagePath, file.path)
    return `${process.env.PLATFORM === 'google' ? 'gs' : 's3'}://${storageBucket}/${storagePath}`
  }
}

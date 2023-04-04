const { randomBetween } = require('../../common/helpers')
const moment = require('moment-timezone')

function getRandomDate () {
  const timestamp = randomBetween(1262304000000, 1672531200000) // between 2010-01-01T00:00:00.000Z and 2023-01-01T00:00:00.000Z
  return moment.utc(timestamp)
}

async function generateSegments (models, streamId, filesCount) {
  const ffId = (await models.AudioFileFormat.findOrCreate({ where: { value: 'wav' } }))[0].id
  const acId = (await models.AudioCodec.findOrCreate({ where: { value: 'wav' } }))[0].id
  const extId = (await models.FileExtension.findOrCreate({ where: { value: '.wav' } }))[0].id

  let index = 0
  const s = getRandomDate()
  while (index < filesCount) {
    const start = s.clone().add(index, 'minutes')
    const sfId = (await models.StreamSourceFile.create({ stream_id: streamId, filename: `${start.format('YYYYMMDD_HHMMSS')}.wav`, duration: 60, sample_count: 1, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: acId, audio_file_format_id: ffId })).id
    await models.StreamSegment.create({ stream_id: streamId, start: start.toISOString(), end: start.clone().add('1', 'minute').toISOString(), stream_source_file_id: sfId, sample_count: 1, file_extension_id: extId })
    index++
  }
  console.log(`Created ${index} segments for stream ${streamId}`)
}

module.exports = {
  generateSegments
}

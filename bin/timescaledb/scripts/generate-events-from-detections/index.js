const path = require('path')
const fs = require('fs')
const util = require('util')
const moment = require('moment')
const guidService = require('../../../../utils/misc/guid')

const eventsFile = fs.createWriteStream(path.join(__dirname, '70-events.sql'), { flags: 'w' })

function getDetections () {
  const lineReader = require('readline').createInterface({
    input: fs.createReadStream(path.join(__dirname, '../../seeds/50-detections.sql'))
  })
  return new Promise((resolve, reject) => {
    var streams = {}
    lineReader
      .on('line', (line) => {
        try {
          const match = (/VALUES \('(.{36})', '(.{12})', (\d{1,3}), (\d{1,3}), '(.{19})', '(.{19})', /gm).exec(line)
          if (match) {
            const detectionId = match[1]
            const streamId = match[2]
            const classificationId = parseInt(match[3])
            const classifierId = parseInt(match[4])
            const start = moment.utc(match[5])
            const end = moment.utc(match[6])
            if (!streams[streamId]) {
              streams[streamId] = {}
            }
            if (!streams[streamId][classificationId]) {
              streams[streamId][classificationId] = []
            }
            streams[streamId][classificationId].push({ detectionId, streamId, classificationId, classifierId, start, end })
          }
        } catch (e) {}
      })
      .on('close', () => {
        resolve(streams)
      })
  })
}

function sortDetections (streams) {
  for (const streamId in streams) {
    for (const classificationId in streams[streamId]) {
      streams[streamId][classificationId].sort((a, b) => {
        return a.start - b.start
      })
    }
  }
}

function mergeDetections (streams) {
  for (const streamId in streams) {
    for (const classificationId in streams[streamId]) {
      let i = 0
      const detections = streams[streamId][classificationId]
      while (i < detections.length) {
        if (i + 1 < detections.length) {
          const cur = detections[i]
          const next = detections[i + 1]
          // if current item has the same end time with next, unite them into one (current)
          if (cur.end.valueOf() === next.start.valueOf()) {
            cur.end = next.end
            cur.endDetectionId = next.detectionId
            detections.splice(i + 1, 1)
          } else {
            // go to next one only if next item has different start time
            i++
          }
        } else {
          i++
        }
      }
    }
  }
}

function getClassifiers () {
  const lineReader = require('readline').createInterface({
    input: fs.createReadStream(path.join(__dirname, '../../seeds/44-classifier-event-strategies.sql'))
  })
  return new Promise((resolve, reject) => {
    var classifiers = {}
    lineReader
      .on('line', (line) => {
        try {
          const match = (/VALUES \((\d{1,3}), (\d{1,3}), (\d{1,3}),/gm).exec(line)
          if (match) {
            classifiers[match[2]] = parseInt(match[3])
          }
        } catch (e) {}
      })
      .on('close', () => {
        resolve(classifiers)
      })
  })
}

function printSql (streams, clasifiers) {
  let sql = ''
  const timeFormat = 'YYYY-MM-DD HH:mm:ss'
  for (const streamId in streams) {
    for (const classificationId in streams[streamId]) {
      streams[streamId][classificationId].forEach((event) => {
        const guid = guidService.generate()
        const strategyId = clasifiers[event.classifierId]
        const endDetectionId = event.endDetectionId || event.detectionId
        sql += `INSERT INTO public.events(id, start, "end", stream_id, classification_id, classifier_event_strategy_id, first_detection_id, last_detection_id, created_at, updated_at) VALUES ('${guid}', '${event.start.format(timeFormat)}', '${event.end.format(timeFormat)}', '${event.streamId}', ${event.classificationId}, ${strategyId}, '${event.detectionId}', '${endDetectionId}', 'NOW()', 'NOW()');\n`
      })
    }
  }
  eventsFile.write(sql)
}

function prepareFiles () {
  return Promise.all([
    util.promisify(eventsFile.open)
  ])
}

function closeFiles () {
  eventsFile.end()
}

async function main () {
  var streams = await getDetections()
  sortDetections(streams)
  mergeDetections(streams)
  const classifiers = await getClassifiers()
  await prepareFiles()
  printSql(streams, classifiers)
  closeFiles()
}

main()

// add code in the following comment into ./modelsTimescale/index.js
// and then start Core API as usual

// setTimeout(() => {
//   const generate = require('../bin/timescaledb/scripts/generate-detections-and-reviews')
//   generate(models)
// }, 3000)
const moment = require('moment')

async function generateStreams (models) {
  const project = { id: 'fakeproject0', name: 'Fake project', createdById: 1 }
  await models.Project.findOrCreate({ where: { id: project.id }, defaults: project })
  const streams = []
  for (let i = 0; i < 50; i++) {
    streams.push({ id: `fakestrm00${i < 10 ? '0' + i : i}`, name: `Fake stream ${i}`, projectId: project.id, createdById: 1 })
  }
  for (const stream of streams) {
    await models.Stream.findOrCreate({
      where: { id: stream.id },
      defaults: stream
    })
  }
  return streams.map(s => s.id)
}

function getRandomFromArray (array) {
  return array[Math.floor(Math.random() * array.length)]
}

function randomBetween (min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

function getRandomReview () {
  const rand = Math.floor(Math.random() * (1 - (-1) + 1) + (-1))
  if (rand < 0) {
    return -1
  } else if (rand > 0) {
    return 1
  } else {
    return 0
  }
}

async function generateDetectionsAndReviews (models, streamIds) {
  const classifiers = [ // put classifier and classification ids which you have in database
    { id: 36, classification: 8076 },
    { id: 36, classification: 7718 },
    { id: 75, classification: 8076 },
    { id: 75, classification: 7723 },
    { id: 74, classification: 8076 },
    { id: 74, classification: 7830 },
    { id: 79, classification: 8076 },
    { id: 79, classification: 7719 },
    { id: 78, classification: 8076 },
    { id: 78, classification: 7952 }
  ]
  const users = [181, 1, 8, 68, 254, 4503] // put user ids which you have in database; at least 6
  const uCounts = {
    mid: Math.floor(users.length / 2),
    max: users.length
  }
  const start = moment('2015-01-01T00:00:00.000Z')
  let detections = []
  let total = 0
  let totalReviews = 0
  while (total < 10000000) {
    const classifier = getRandomFromArray(classifiers)
    detections.push({
      stream_id: getRandomFromArray(streamIds),
      classifier_id: classifier.id,
      classification_id: classifier.classification,
      start: start.clone().toISOString(),
      end: start.clone().add(2, 'seconds').toISOString(),
      confidence: (Math.random() * (1 - 0.9) + 0.9).toFixed(8), // between 0.9 and 1
      review_status: getRandomReview()
    })
    if (detections.length === 100) { // save by chunks with size of 100 items
      const dbDetections = await models.Detection.bulkCreate(detections, { returning: ['id'] })
      let reviews = []
      dbDetections.forEach((dbDetection) => {
        if (dbDetection.review_status !== 0) {
          const detectionReviews = []
          const positive = `${dbDetection.review_status}` === '1'
          const higherNumber = randomBetween(uCounts.max, 1)
          const lowerNumber = randomBetween(higherNumber > uCounts.mid ? uCounts.max - higherNumber : higherNumber - 1, 0)
          const positiveReviewsCount = positive ? higherNumber : lowerNumber
          const negativeReviewsCount = positive ? lowerNumber : higherNumber
          for (let i = 0; i < positiveReviewsCount; i++) {
            detectionReviews.push({
              detection_id: dbDetection.id,
              user_id: users[i],
              positive: true
            })
          }
          for (let i = 0; i < negativeReviewsCount; i++) {
            detectionReviews.push({
              detection_id: dbDetection.id,
              user_id: users[positiveReviewsCount + i],
              positive: false
            })
          }
          reviews = [...reviews, ...detectionReviews]
        }
      })
      await models.DetectionReview.bulkCreate(reviews)
      total += detections.length
      totalReviews += reviews.length
      console.log(`Saved ${total} detections with ${totalReviews} reviews.`)
      detections = []
      reviews = []
    }
    start.add('2', 'seconds')
  }
}

async function main (models) {
  const streamIds = await generateStreams(models)
  await generateDetectionsAndReviews(models, streamIds)
}

module.exports = main

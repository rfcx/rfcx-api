const moment = require('moment')
const { saveMeta: { Detections } } = require('./mqtt-save-meta')
const models = require('../../../core/_models')
const { seedValues, truncateNonBase } = require('../../../common/testing/sequelize')

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
})

async function commonSetup () {
  const stream = { id: 'abc', name: 'my stream', createdById: seedValues.primaryUserId }
  await models.Stream.findOrCreate({ where: stream })
  const classification = { id: 6, value: 'vehicle', title: 'Vehicle', typeId: 1, sourceId: 1 }
  await models.Classification.findOrCreate({ where: classification })
  const classifier = { id: 3, externalId: 'cccddd', name: 'vehicle', version: 5, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://something' }
  await models.Classifier.findOrCreate({ where: classifier })
  const classifierOutput = { classifierId: classifier.id, classificationId: classification.id, outputClassName: 'vh', ignoreThreshold: 0.1 }
  await models.ClassifierOutput.findOrCreate({ where: classifierOutput })
  return { stream, classification, classifier, classifierOutput }
}

test('can save detections single payload', async () => {
  const { stream, classifier, classifierOutput } = await commonSetup()
  const start = 1420070745567
  const step = 1000
  const confidencesRaw = ',,,0.98,,,,,,,,,,,,0.98,,,,0.95,,,,,,,,,,,0.90,,,,,0.97,,,,,,,,,,0.96,,,,,,'
  const input = `${classifierOutput.outputClassName}*${classifier.name}-v${classifier.version}*${start}*${step}*${confidencesRaw}`
  console.info = jest.fn()

  await Detections([input], stream.id)

  const detections = await models.Detection.findAll({ order: ['start'] })
  expect(detections.length).toBe(6)
  expect(detections[0].start).toEqual(moment(start + 3 * step).toDate())
  expect(detections[0].confidence).toBe(0.98)
  expect(detections[1].start).toEqual(moment(start + 15 * step).toDate())
  expect(detections[1].confidence).toBe(0.98)
  expect(detections[2].start).toEqual(moment(start + 19 * step).toDate())
  expect(detections[2].confidence).toBe(0.95)
  expect(detections[3].start).toEqual(moment(start + 30 * step).toDate())
  expect(detections[3].confidence).toBe(0.90)
})

test('can save detections single payload abbreviated', async () => {
  const { stream, classifier, classifierOutput } = await commonSetup()
  const start = 1420070745567
  const step = 1000
  const confidencesRaw = 'n3,0.98,n11,0.98,n3,0.95,n10,0.90,n4,0.97,n9,0.96,n6'
  const input = `${classifierOutput.outputClassName}*${classifier.name}-v${classifier.version}*${start}*${step}*${confidencesRaw}`
  console.info = jest.fn()

  await Detections([input], stream.id)

  const detections = await models.Detection.findAll({ order: ['start'] })
  expect(detections.length).toBe(6)
  expect(detections[0].start).toEqual(moment(start + 3 * step).toDate())
  expect(detections[0].confidence).toBe(0.98)
  expect(detections[1].start).toEqual(moment(start + 15 * step).toDate())
  expect(detections[1].confidence).toBe(0.98)
  expect(detections[2].start).toEqual(moment(start + 19 * step).toDate())
  expect(detections[2].confidence).toBe(0.95)
  expect(detections[3].start).toEqual(moment(start + 30 * step).toDate())
  expect(detections[3].confidence).toBe(0.90)
})

test('can save detections multiple payloads', async () => {
  const { stream, classifier, classifierOutput } = await commonSetup()
  const start1 = 1619211870411
  const start2 = 1619212320741
  const step = 975
  const confidencesRaw1 = ',,,,,,,,,0.99,,,,,0.96,,,,0.99,0.98,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,0.99,0.98,,,0.97,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,'
  const confidencesRaw2 = ',,,,,,,,,0.98,,0.98,,,,,0.99,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,0.99,,,,,,,,0.98,,,,,,,,,,,,,,,,,,,,,,0.95,,,,'
  const input1 = `${classifierOutput.outputClassName}*${classifier.name}-v${classifier.version}*${start1}*${step}*${confidencesRaw1}`
  const input2 = `${classifierOutput.outputClassName}*${classifier.name}-v${classifier.version}*${start2}*${step}*${confidencesRaw2}`
  console.info = jest.fn()

  await Detections([input1, input2], stream.id)

  const detections = await models.Detection.findAll({ order: ['start'] })
  expect(detections.length).toBe(13)
  expect(detections[0].start).toEqual(moment(start1 + 9 * step).toDate())
  expect(detections[0].confidence).toBe(0.99)
  expect(detections[7].start).toEqual(moment(start2 + 9 * step).toDate())
  expect(detections[7].confidence).toBe(0.98)
  expect(detections[8].start).toEqual(moment(start2 + 11 * step).toDate())
  expect(detections[8].confidence).toBe(0.98)
  expect(detections[12].start).toEqual(moment(start2 + 89 * step).toDate())
  expect(detections[12].confidence).toBe(0.95)
})

test('can save detections multiple payloads abbreviated', async () => {
  const { stream, classifier, classifierOutput } = await commonSetup()
  const start1 = 1619211870411
  const start2 = 1619212320741
  const step = 975
  const confidencesRaw1 = 'n9,0.99,n4,0.96,n3,0.99,0.98,n36,0.99,0.98,n2,0.97,n33'
  const confidencesRaw2 = 'n9,0.98,n1,0.98,n4,0.99,n42,0.99,n7,0.98,n21,0.95,n4'
  const input1 = `${classifierOutput.outputClassName}*${classifier.name}-v${classifier.version}*${start1}*${step}*${confidencesRaw1}`
  const input2 = `${classifierOutput.outputClassName}*${classifier.name}-v${classifier.version}*${start2}*${step}*${confidencesRaw2}`
  console.info = jest.fn()

  await Detections([input1, input2], stream.id)

  const detections = await models.Detection.findAll({ order: ['start'] })
  expect(detections.length).toBe(13)
  expect(detections[0].start).toEqual(moment(start1 + 9 * step).toDate())
  expect(detections[0].confidence).toBe(0.99)
  expect(detections[7].start).toEqual(moment(start2 + 9 * step).toDate())
  expect(detections[7].confidence).toBe(0.98)
  expect(detections[8].start).toEqual(moment(start2 + 11 * step).toDate())
  expect(detections[8].confidence).toBe(0.98)
  expect(detections[12].start).toEqual(moment(start2 + 89 * step).toDate())
  expect(detections[12].confidence).toBe(0.95)
})

test('can save detections multiple payloads abbreviated and empty string', async () => {
  const { stream, classifier, classifierOutput } = await commonSetup()
  const start1 = 1619211870411
  const start2 = 1619212320741
  const step = 975
  const confidencesRaw1 = 'n9,,,,0.99,n4,0.96,n3,0.99,0.98,n36,0.99,0.98,n2,0.97,n33'
  const confidencesRaw2 = 'n9,,,0.98,n1,,0.98,n4,0.99,n42,0.99,n7,0.98,n21,0.95,n4'
  const input1 = `${classifierOutput.outputClassName}*${classifier.name}-v${classifier.version}*${start1}*${step}*${confidencesRaw1}`
  const input2 = `${classifierOutput.outputClassName}*${classifier.name}-v${classifier.version}*${start2}*${step}*${confidencesRaw2}`
  console.info = jest.fn()

  await Detections([input1, input2], stream.id)

  const detections = await models.Detection.findAll({ order: ['start'] })
  expect(detections.length).toBe(13)
  expect(detections[0].start).toEqual(moment(start1 + 12 * step).toDate())
  expect(detections[0].confidence).toBe(0.99)
  expect(detections[7].start).toEqual(moment(start2 + 11 * step).toDate())
  expect(detections[7].confidence).toBe(0.98)
  expect(detections[8].start).toEqual(moment(start2 + 14 * step).toDate())
  expect(detections[8].confidence).toBe(0.98)
  expect(detections[12].start).toEqual(moment(start2 + 92 * step).toDate())
  expect(detections[12].confidence).toBe(0.95)
})

test('can save payload with bad step (*1000)', async () => {
  const { stream, classifier, classifierOutput } = await commonSetup()
  const start = 1420070745567
  const step = 1000
  const confidencesRaw = ',,,0.98,,,,,,,,,,,,0.98,,,,0.95,,,,,,,,,,,0.90,,,,,0.97,,,,,,,,,,0.96,,,,,,'
  const input = `${classifierOutput.outputClassName}*${classifier.name}-v${classifier.version}*${start}*${step * 1000}*${confidencesRaw}`
  console.info = jest.fn()

  await Detections([input], stream.id)

  const detections = await models.Detection.findAll({ order: ['start'] })
  expect(detections.length).toBe(6)
  expect(detections[0].start).toEqual(moment(start + 3 * step).toDate())
})

test('can save payload with bad step (*1000) abbreviated', async () => {
  const { stream, classifier, classifierOutput } = await commonSetup()
  const start = 1420070745567
  const step = 1000
  const confidencesRaw = 'n3,0.98,n11,0.98,n3,0.95,n10,0.90,n4,0.97,n9,0.96,n6'
  const input = `${classifierOutput.outputClassName}*${classifier.name}-v${classifier.version}*${start}*${step * 1000}*${confidencesRaw}`
  console.info = jest.fn()

  await Detections([input], stream.id)

  const detections = await models.Detection.findAll({ order: ['start'] })
  expect(detections.length).toBe(6)
  expect(detections[0].start).toEqual(moment(start + 3 * step).toDate())
})

test('can save payload with missing -edge in classifier name (chainsaw-v5)', async () => {
  const { stream, classification } = await commonSetup()
  const classifier = { id: 4, externalId: 'dddeee', name: 'chainsaw-edge', version: 5, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://something' }
  await models.Classifier.create(classifier)
  const classifierOutput = { classifierId: classifier.id, classificationId: classification.id, outputClassName: 'ch', ignoreThreshold: 0.1 }
  await models.ClassifierOutput.create(classifierOutput)
  const input = `${classifierOutput.outputClassName}*chainsaw-v${classifier.version}*1420070745567*1000*0.98,`
  console.info = jest.fn()

  await Detections([input], stream.id)

  const detections = await models.Detection.findAll({ order: ['start'] })
  expect(detections.length).toBe(1)
})

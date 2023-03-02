const request = require('supertest')
const routes = require('./aggregated-detections')
const models = require('../../_models')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../../common/testing/sequelize')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  await truncate(models)
})

async function commonSetup () {
  const streamIds = ['844qvbjhmzkr', '934a43f2fp3q', '2kg1xourixpz', '3fqoc4okv9en']
  for (let i = 0; i < streamIds.length; i++) {
    await models.Stream.create({ id: streamIds[i], name: `Tembe ${i + 1}`, createdById: seedValues.primaryUserId })
  }
  const classification = { id: 7718, value: 'chainsaw', title: 'Chainsaw', typeId: 1, sourceId: 1 }
  await models.Classification.create(classification)
  const classifier = { id: 88, externalId: 'cccddd', name: 'chainsaw model', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://something' }
  await models.Classifier.create(classifier)

  const inserts = `
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120001', '2021-04-14 15:24:10.760000', '2021-04-14 15:40:25.760000', '844qvbjhmzkr', 7718, 88, 0.95);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120002', '2021-04-14 17:50:25.760000', '2021-04-14 18:06:40.760000', '844qvbjhmzkr', 7718, 88, 0.97);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120003', '2021-04-14 22:59:10.760000', '2021-04-14 23:15:25.760000', '844qvbjhmzkr', 7718, 88, 0.97);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120004', '2021-04-14 17:51:02.927000', '2021-04-14 18:07:17.927000', '934a43f2fp3q', 7718, 88, 1);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120005', '2021-04-14 18:07:17.927000', '2021-04-14 18:23:32.927000', '934a43f2fp3q', 7718, 88, 1);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120006', '2021-04-14 18:23:32.927000', '2021-04-14 18:39:47.927000', '934a43f2fp3q', 7718, 88, 1);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120007', '2021-04-14 18:39:47.927000', '2021-04-14 18:56:02.927000', '934a43f2fp3q', 7718, 88, 1);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120008', '2021-04-14 19:49:06.906000', '2021-04-14 20:05:21.906000', '934a43f2fp3q', 7718, 88, 0.97);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120009', '2021-04-14 20:01:02.927000', '2021-04-14 20:17:17.927000', '934a43f2fp3q', 7718, 88, 1);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120010', '2021-04-14 20:05:21.906000', '2021-04-14 20:21:36.906000', '934a43f2fp3q', 7718, 88, 1);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120011', '2021-04-15 20:44:56.877000', '2021-04-15 21:01:11.877000', '934a43f2fp3q', 7718, 88, 0.98);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120012', '2021-04-15 20:48:24.150000', '2021-04-15 21:04:39.150000', '934a43f2fp3q', 7718, 88, 1);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120013', '2021-04-15 21:01:11.877000', '2021-04-15 21:17:26.877000', '934a43f2fp3q', 7718, 88, 0.95);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120014', '2021-04-15 21:17:26.877000', '2021-04-15 21:33:41.877000', '934a43f2fp3q', 7718, 88, 1);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120015', '2021-04-15 21:33:41.877000', '2021-04-15 21:49:56.877000', '934a43f2fp3q', 7718, 88, 1);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120016', '2021-04-15 21:49:56.877000', '2021-04-15 22:06:11.877000', '934a43f2fp3q', 7718, 88, 1);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120017', '2021-04-15 22:38:41.877000', '2021-04-15 22:54:56.877000', '934a43f2fp3q', 7718, 88, 0.98);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120018', '2021-04-15 23:11:11.877000', '2021-04-15 23:27:26.877000', '934a43f2fp3q', 7718, 88, 0.98);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120019', '2021-04-15 23:27:26.877000', '2021-04-15 23:43:41.877000', '934a43f2fp3q', 7718, 88, 1);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120020', '2021-04-15 23:43:41.877000', '2021-04-15 23:59:56.877000', '934a43f2fp3q', 7718, 88, 0.98);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120021', '2021-04-16 00:16:11.877000', '2021-04-16 00:32:26.877000', '934a43f2fp3q', 7718, 88, 0.99);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120022', '2021-04-16 00:32:26.877000', '2021-04-16 00:48:41.877000', '934a43f2fp3q', 7718, 88, 0.99);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120023', '2021-04-16 00:48:41.877000', '2021-04-16 01:04:56.877000', '934a43f2fp3q', 7718, 88, 1);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120024', '2021-04-16 01:04:56.877000', '2021-04-16 01:21:11.877000', '934a43f2fp3q', 7718, 88, 1);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120025', '2021-04-16 01:21:11.877000', '2021-04-16 01:37:26.877000', '934a43f2fp3q', 7718, 88, 1);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120026', '2021-04-20 01:43:31.312000', '2021-04-20 01:59:46.312000', '2kg1xourixpz', 7718, 88, 0.99);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120027', '2021-04-20 11:44:46.312000', '2021-04-20 12:01:01.312000', '2kg1xourixpz', 7718, 88, 1);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120028', '2021-04-20 12:01:01.312000', '2021-04-20 12:17:16.312000', '2kg1xourixpz', 7718, 88, 1);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120029', '2021-04-20 12:17:16.312000', '2021-04-20 12:33:31.312000', '2kg1xourixpz', 7718, 88, 0.99);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120030', '2021-04-19 18:08:01.718000', '2021-04-19 18:24:16.718000', '3fqoc4okv9en', 7718, 88, 0.96);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120031', '2021-04-19 18:24:16.718000', '2021-04-19 18:40:31.718000', '3fqoc4okv9en', 7718, 88, 1);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120032', '2021-04-19 18:40:31.718000', '2021-04-19 18:56:46.718000', '3fqoc4okv9en', 7718, 88, 0.98);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120033', '2021-04-19 19:29:16.718000', '2021-04-19 19:45:31.718000', '3fqoc4okv9en', 7718, 88, 0.99);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120034', '2021-04-19 20:01:46.718000', '2021-04-19 20:18:01.718000', '3fqoc4okv9en', 7718, 88, 0.95);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120035', '2021-04-17 16:33:54.418000', '2021-04-17 16:50:09.418000', '844qvbjhmzkr', 7718, 88, 1);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120036', '2021-04-17 16:50:09.418000', '2021-04-17 17:06:24.418000', '844qvbjhmzkr', 7718, 88, 1);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120037', '2021-04-17 17:38:54.418000', '2021-04-17 17:55:09.418000', '844qvbjhmzkr', 7718, 88, 0.97);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120038', '2021-04-17 19:48:21.132000', '2021-04-17 20:04:36.132000', '844qvbjhmzkr', 7718, 88, 1);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120039', '2021-04-17 19:48:54.418000', '2021-04-17 20:05:09.418000', '844qvbjhmzkr', 7718, 88, 1);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120040', '2021-04-17 20:04:36.132000', '2021-04-17 20:20:51.132000', '844qvbjhmzkr', 7718, 88, 0.99);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120041', '2021-04-17 20:05:09.418000', '2021-04-17 20:21:24.418000', '844qvbjhmzkr', 7718, 88, 0.99);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120042', '2021-04-17 20:20:51.132000', '2021-04-17 20:37:06.132000', '844qvbjhmzkr', 7718, 88, 0.99);
    INSERT INTO detections (id, start, "end", stream_id, classification_id, classifier_id, confidence) VALUES ('f95e4ee0-b934-11ed-afa1-0242ac120043', '2021-04-17 20:21:24.418000', '2021-04-17 20:37:39.418000', '844qvbjhmzkr', 7718, 88, 1);
    `.split(';')
  for (let insert of inserts) {
    insert = insert.trim()
    if (insert !== '') {
      await models.sequelize.query(insert)
    }
  }

  return { classification, classifier, streamIds }
}

describe('GET /internal/cognition/aggregated-detections', () => {
  test('returns count, min_start, max_end', async () => {
    const { classification, classifier, streamIds } = await commonSetup()
    const query = {
      start: '2021-04-14T00:00:00Z',
      end: '2021-04-21T23:59:59Z',
      classifier: classifier.id,
      min_confidence: 0.95
    }

    const response = await request(app).get('/aggregated-detections').query(query)

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(streamIds.length)
    expect(response.body[0].classification_id).toBe(classification.id)
    expect(Object.keys(response.body[0])).toEqual(expect.arrayContaining(['count', 'min_start', 'max_end']))
  })

  test('minimum confidence', async () => {
    const { classifier } = await commonSetup()
    const query = {
      start: '2021-04-14T00:00:00Z',
      end: '2021-04-21T23:59:59Z',
      classifier: classifier.id,
      min_confidence: 0.99
    }

    const response = await request(app).get('/aggregated-detections').query(query)

    expect(response.body.find(x => x.stream_id === '3fqoc4okv9en').count).toBe(2)
  })

  test('minimum count', async () => {
    const { classifier } = await commonSetup()
    const query = {
      start: '2021-04-14T00:00:00Z',
      end: '2021-04-21T23:59:59Z',
      classifier: classifier.id,
      min_confidence: 0.95,
      min_count: 10
    }

    const response = await request(app).get('/aggregated-detections').query(query)

    expect(response.body.length).toBe(1)
  })
})

const models = require('..')
const { seedValues, truncateNonBase } = require('../../../common/testing/sequelize')

afterEach(async () => {
  await truncateNonBase(models)
})

test('no streams', async () => {
  // Arrange / Given
  const project = { id: 'pq2', createdById: seedValues.primaryUserId, name: 'PQ2' }

  // Act / When
  await models.Project.create(project)

  // Assert / Then
  const updatedProject = await models.Project.findByPk(project.id)
  expect(updatedProject.maxLatitude).toBeNull()
  expect(updatedProject.minLatitude).toBeNull()
  expect(updatedProject.maxLongitude).toBeNull()
  expect(updatedProject.minLongitude).toBeNull()
})

test('single stream', async () => {
  // Arrange / Given
  const project = { id: 'pq2', createdById: seedValues.primaryUserId, name: 'PQ2' }
  await models.Project.create(project)
  const stream = { id: 'ab1', latitude: 10.123444, longitude: 101.123444, projectId: project.id, createdById: seedValues.primaryUserId, name: 'AB01' }

  // Act / When
  await models.Stream.create(stream)

  // Assert / Then
  const updatedProject = await models.Project.findByPk(project.id)
  expect(updatedProject.maxLatitude).toBe(stream.latitude)
  expect(updatedProject.minLatitude).toBe(stream.latitude)
  expect(updatedProject.maxLongitude).toBe(stream.longitude)
  expect(updatedProject.minLongitude).toBe(stream.longitude)
})

test('new stream extends bounds', async () => {
  // Arrange / Given
  const project = { id: 'pq2', createdById: seedValues.primaryUserId, name: 'PQ2' }
  await models.Project.create(project)
  const stream1 = { id: 'ab1', latitude: 10.123444, longitude: 101.123444, projectId: project.id, createdById: seedValues.primaryUserId, name: 'AB01' }
  await models.Stream.create(stream1)
  const stream2 = { id: 'ab2', latitude: 9.123444, longitude: 99.123444, projectId: project.id, createdById: seedValues.primaryUserId, name: 'AB02' }

  // Act / When
  await models.Stream.create(stream2)

  // Assert / Then
  const updatedProject = await models.Project.findByPk(project.id)
  expect(updatedProject.maxLatitude).toBe(stream1.latitude)
  expect(updatedProject.minLatitude).toBe(stream2.latitude)
  expect(updatedProject.maxLongitude).toBe(stream1.longitude)
  expect(updatedProject.minLongitude).toBe(stream2.longitude)
})

test('new stream same bounds', async () => {
  // Arrange / Given
  const project = { id: 'pq2', createdById: seedValues.primaryUserId, name: 'PQ2' }
  await models.Project.create(project)
  const stream1 = { id: 'ab1', latitude: 10.123444, longitude: 101.123444, projectId: project.id, createdById: seedValues.primaryUserId, name: 'AB01' }
  await models.Stream.create(stream1)
  const stream2 = { id: 'ab2', latitude: 10.123444, longitude: 101.123444, projectId: project.id, createdById: seedValues.primaryUserId, name: 'AB02' }

  // Act / When
  await models.Stream.create(stream2)

  // Assert / Then
  const updatedProject = await models.Project.findByPk(project.id)
  expect(updatedProject.maxLatitude).toBe(stream1.latitude)
  expect(updatedProject.minLatitude).toBe(stream1.latitude)
  expect(updatedProject.maxLongitude).toBe(stream1.longitude)
  expect(updatedProject.minLongitude).toBe(stream1.longitude)
})

test('updated stream extends bounds', async () => {
  // Arrange / Given
  const project = { id: 'pq2', createdById: seedValues.primaryUserId, name: 'PQ2' }
  await models.Project.create(project)
  const stream1 = { id: 'ab1', latitude: 10.123444, longitude: 101.123444, projectId: project.id, createdById: seedValues.primaryUserId, name: 'AB01' }
  await models.Stream.create(stream1)
  const stream2 = { id: 'ab2', latitude: 9.123444, longitude: 99.123444, projectId: project.id, createdById: seedValues.primaryUserId, name: 'AB02' }
  await models.Stream.create(stream2)

  // Act / When
  const newStream1latitude = 11.1
  await models.Stream.update({ latitude: newStream1latitude }, { where: { id: stream1.id }, individualHooks: true })

  // Assert / Then
  const updatedProject = await models.Project.findByPk(project.id)
  expect(updatedProject.maxLatitude).toBe(newStream1latitude)
  expect(updatedProject.minLatitude).toBe(stream2.latitude)
  expect(updatedProject.maxLongitude).toBe(stream1.longitude)
  expect(updatedProject.minLongitude).toBe(stream2.longitude)
})

test('updated stream same lat lng', async () => {
  // Arrange / Given
  const project = { id: 'pq2', createdById: seedValues.primaryUserId, name: 'PQ2' }
  await models.Project.create(project)
  const stream = { id: 'ab1', latitude: 10.123444, longitude: 101.123444, projectId: project.id, createdById: seedValues.primaryUserId, name: 'AB01' }
  await models.Stream.create(stream)

  // Act / When
  const newStreamlatitude = 10.123444
  await models.Stream.update({ latitude: newStreamlatitude }, { where: { id: stream.id }, individualHooks: true })

  // Assert / Then
  const updatedProject = await models.Project.findByPk(project.id)
  expect(updatedProject.maxLatitude).toBe(stream.latitude)
  expect(updatedProject.minLatitude).toBe(stream.latitude)
  expect(updatedProject.maxLongitude).toBe(stream.longitude)
  expect(updatedProject.minLongitude).toBe(stream.longitude)
})

test('updated stream to another project', async () => {
  // Arrange / Given
  const project1 = { id: 'pq1', createdById: seedValues.primaryUserId, name: 'PQ1' }
  await models.Project.create(project1)
  const project2 = { id: 'pq2', createdById: seedValues.primaryUserId, name: 'PQ2' }
  await models.Project.create(project2)
  const stream1 = { id: 'ab1', latitude: 10.123444, longitude: 101.123444, projectId: project1.id, createdById: seedValues.primaryUserId, name: 'AB01' }
  await models.Stream.create(stream1)
  const stream2 = { id: 'ab2', latitude: 9.123444, longitude: 99.123444, projectId: project1.id, createdById: seedValues.primaryUserId, name: 'AB02' }
  await models.Stream.create(stream2)

  // Act / When
  await models.Stream.update({ projectId: project2.id }, { where: { id: stream1.id }, individualHooks: true })

  // Assert / Then
  const updatedProject = await models.Project.findByPk(project2.id)
  expect(updatedProject.maxLatitude).toBe(stream1.latitude)
  expect(updatedProject.minLatitude).toBe(stream1.latitude)
  expect(updatedProject.maxLongitude).toBe(stream1.longitude)
  expect(updatedProject.minLongitude).toBe(stream1.longitude)

  const previousProject = await models.Project.findByPk(project1.id)
  expect(previousProject.maxLatitude).toBe(stream2.latitude)
  expect(previousProject.minLatitude).toBe(stream2.latitude)
  expect(previousProject.maxLongitude).toBe(stream2.longitude)
  expect(previousProject.minLongitude).toBe(stream2.longitude)
})

test('remove stream', async () => {
  // Arrange / Given
  const project = { id: 'pq2', createdById: seedValues.primaryUserId, name: 'PQ2' }
  await models.Project.create(project)
  const stream1 = { id: 'ab1', latitude: 10.123444, longitude: 101.123444, projectId: project.id, createdById: seedValues.primaryUserId, name: 'AB01' }
  await models.Stream.create(stream1)
  const stream2 = { id: 'ab2', latitude: 9.123444, longitude: 99.123444, projectId: project.id, createdById: seedValues.primaryUserId, name: 'AB02' }
  await models.Stream.create(stream2)

  // Act / When
  await models.Stream.destroy({ where: { id: stream1.id }, individualHooks: true })

  // Assert / Then
  const updatedProject = await models.Project.findByPk(project.id)
  expect(updatedProject.maxLatitude).toBe(stream2.latitude)
  expect(updatedProject.minLatitude).toBe(stream2.latitude)
  expect(updatedProject.maxLongitude).toBe(stream2.longitude)
  expect(updatedProject.minLongitude).toBe(stream2.longitude)
})

test('remove the last stream in project', async () => {
  // Arrange / Given
  const project = { id: 'pq2', createdById: seedValues.primaryUserId, name: 'PQ2' }
  await models.Project.create(project)
  const stream = { id: 'ab1', latitude: 10.123444, longitude: 101.123444, projectId: project.id, createdById: seedValues.primaryUserId, name: 'AB01' }
  await models.Stream.create(stream)

  // Act / When
  await models.Stream.destroy({ where: { id: stream.id }, individualHooks: true })

  // Assert / Then
  const updatedProject = await models.Project.findByPk(project.id)
  expect(updatedProject.maxLatitude).toBeNull()
  expect(updatedProject.minLatitude).toBeNull()
  expect(updatedProject.maxLongitude).toBeNull()
  expect(updatedProject.minLongitude).toBeNull()
})

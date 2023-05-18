const { getRandomFromArray } = require('../../common/helpers')
const { randomId } = require('../../common/crypto/random')

async function generateProjectsWithStreams (models, users, projectsCount, streamsPerProjectCount) {
  const projects = []
  for (let i = 0; i < projectsCount; i++) {
    const user = getRandomFromArray(users)
    const project = {
      id: randomId(),
      name: `${user.firstname} ${user.lastname} project ${i}`,
      createdById: user.id,
      isPublic: true,
      streams: []
    }
    for (let j = 0; j < streamsPerProjectCount; j++) {
      project.streams.push({
        id: randomId(),
        name: `${user.firstname} ${user.lastname} stream ${j}`,
        isPublic: true,
        createdById: user.id
      })
    }
    projects.push(project)
  }
  for (const project of projects) {
    project.id = (await models.Project.create(project)).id
    for (const stream of project.streams) {
      stream.id = (await models.Stream.create({ ...stream, projectId: project.id })).id
    }
    console.log(`Created ${project.streams.length} streams in project ${project.name}`)
  }
  console.log(`Created ${projects.length} projects with streams`)
  return projects
}

module.exports = {
  generateProjectsWithStreams
}

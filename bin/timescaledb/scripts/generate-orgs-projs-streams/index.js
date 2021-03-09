const path = require('path')
const fs = require('fs')
const util = require('util')
const hash = require('../../../../utils/misc/hash')
const words = require('./vocabulary')

const orgStream = fs.createWriteStream(path.join(__dirname, '05-organizations.sql'), { flags: 'w' })
const projStream = fs.createWriteStream(path.join(__dirname, '06-projects.sql'), { flags: 'w' })
const streamsStream = fs.createWriteStream(path.join(__dirname, '10-streams.sql'), { flags: 'w' })
const orgRolesStream = fs.createWriteStream(path.join(__dirname, '07-user-organization-roles.sql'), { flags: 'w' })
const projRolesStream = fs.createWriteStream(path.join(__dirname, '08-user-project-roles.sql'), { flags: 'w' })
const streamRolesStream = fs.createWriteStream(path.join(__dirname, '11-user-stream-roles.sql'), { flags: 'w' })

const orgsPerUser = 500
const projsPerUser = 5000
const streamsPerUser = 50000

function getUserIds () {
  const lineReader = require('readline').createInterface({
    input: fs.createReadStream(path.join(__dirname, '../../seeds/02-users.sql'))
  })
  return new Promise((resolve, reject) => {
    var userIds = []
    lineReader
      .on('line', (line) => {
        try {
          const match = (/VALUES \((\d+),/g).exec(line)
          const id = parseInt(match[1])
          if (!isNaN(id)) {
            userIds.push(id)
          }
        } catch (e) { }
      })
      .on('close', () => {
        resolve(userIds)
      })
  })
}

function getRandomWords (count = 1) {
  let str = ''
  for (let i = 0; i < count; i++) {
    str += `${words[Math.floor(Math.random() * words.length)]} `
  }
  return str.trim()
}

function getRandomBoolean () {
  return Math.random() < 0.5
}

function getRandomArrItem (arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateOrganizations (userId) {
  const ids = []
  let sql = ''
  for (let i = 0; i < orgsPerUser; i++) {
    const id = hash.randomId()
    const name = getRandomWords(3)
    const isPublic = getRandomBoolean()
    sql += `INSERT INTO public.organizations(id, name, is_public, created_by_id, created_at, updated_at, deleted_at) VALUES ('${id}', '${name}', ${isPublic}, ${userId}, '2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z', null);\n`
    ids.push(id)
  }
  orgStream.write(sql)
  return ids
}

function generateProjects (userId, organizationIds) {
  const ids = []
  let sql = ''
  const orgIds = [null, ...organizationIds]
  for (let i = 0; i < projsPerUser; i++) {
    const id = hash.randomId()
    const name = getRandomWords(3)
    const isPublic = getRandomBoolean()
    const parent = getRandomArrItem(orgIds)
    sql += `INSERT INTO public.projects(id, name, description, is_public, organization_id, created_by_id, external_id, created_at, updated_at, deleted_at) VALUES ('${id}', '${name}', null, ${isPublic}, ${parent === null ? parent : "'" + parent + "'"}, ${userId}, null, '2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z', null);\n`
    ids.push(id)
  }
  projStream.write(sql)
  return ids
}

function generateStreams (userId, projectIds) {
  const ids = []
  let sql = ''
  const projIds = [null, ...projectIds]
  for (let i = 0; i < streamsPerUser; i++) {
    const id = hash.randomId()
    const name = getRandomWords(3)
    const isPublic = getRandomBoolean()
    const parent = getRandomArrItem(projIds)
    sql += `INSERT INTO public.streams(id, name, start, "end", is_public, project_id, created_by_id, created_at, updated_at) VALUES ('${id}', '${name}', '2020-01-01T00:00:00.000Z', '2020-12-31T23:59:59.999Z', ${isPublic}, ${parent === null ? parent : "'" + parent + "'"}, ${userId}, '2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z');\n`
    ids.push(id)
  }
  streamsStream.write(sql)
  return ids
}

function prepareFiles () {
  return Promise.all([
    util.promisify(orgStream.open),
    util.promisify(projStream.open),
    util.promisify(streamsStream.open),
    util.promisify(orgRolesStream.open),
    util.promisify(projRolesStream.open),
    util.promisify(streamRolesStream.open)
  ])
}

function closeFiles () {
  orgStream.end()
  projStream.end()
  streamsStream.end()
  orgRolesStream.end()
  projRolesStream.end()
  streamRolesStream.end()
}

function generateItems (userIds) {
  const usersObj = {}
  userIds.forEach((id, ind) => {
    usersObj[id] = {
      organizationIds: generateOrganizations(id)
    }
    usersObj[id].projectIds = generateProjects(id, usersObj[id].organizationIds)
    usersObj[id].streamIds = generateStreams(id, usersObj[id].projectIds)
    process.stdout.write(`Generating organizations, projects, streams: ${(ind + 1) / userIds.length * 100}% complete... \r`)
  })
  return usersObj
}

function generateUserOrganizationRoles (ids, userIds) {
  let sql = ''
  ids.forEach((id) => {
    const roleId = getRandomArrItem([1, 2, 3])
    sql += `INSERT INTO public.user_organization_roles(user_id, organization_id, role_id, created_at, updated_at) VALUES (${getRandomArrItem(userIds)}, '${id}', ${roleId}, '2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z');\n`
  })
  orgRolesStream.write(sql)
}

function generateUserProjectRoles (ids, userIds) {
  let sql = ''
  ids.forEach((id) => {
    const roleId = getRandomArrItem([1, 2, 3])
    sql += `INSERT INTO public.user_project_roles(user_id, project_id, role_id, created_at, updated_at) VALUES (${getRandomArrItem(userIds)}, '${id}', ${roleId}, '2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z');\n`
  })
  projRolesStream.write(sql)
}

function generateUserStreamRoles (ids, userIds) {
  let sql = ''
  ids.forEach((id) => {
    const roleId = getRandomArrItem([1, 2, 3])
    sql += `INSERT INTO public.user_stream_roles(user_id, stream_id, role_id, created_at, updated_at) VALUES (${getRandomArrItem(userIds)}, '${id}', ${roleId}, '2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z');\n`
  })
  streamRolesStream.write(sql)
}

function randomSharing (userIds, usersObj) {
  userIds.forEach((id, ind) => {
    const otherUserIds = userIds.filter(x => x !== id)
    const randomOrgs = usersObj[id].organizationIds.sort(() => 0.5 - Math.random()).slice(0, Math.floor(orgsPerUser / 1.25))
    generateUserOrganizationRoles(randomOrgs, otherUserIds)
    const randomProjs = usersObj[id].projectIds.sort(() => 0.5 - Math.random()).slice(0, Math.floor(projsPerUser / 1.25))
    generateUserProjectRoles(randomProjs, otherUserIds)
    const randomStreams = usersObj[id].streamIds.sort(() => 0.5 - Math.random()).slice(0, Math.floor(streamsPerUser / 1.25))
    generateUserStreamRoles(randomStreams, otherUserIds)
    process.stdout.write(`Generating user roles: ${(ind + 1) / userIds.length * 100}% complete... \r`)
  })
}

async function main () {
  const userIds = await getUserIds()
  await prepareFiles()
  const usersObj = generateItems(userIds)
  console.log('Generating organizations, projects, streams: 100% complete...')
  randomSharing(userIds, usersObj)
  process.stdout.write('Generating user roles: 100% complete... \r')
  closeFiles()
}

main()

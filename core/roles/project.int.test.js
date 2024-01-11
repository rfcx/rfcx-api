const routes = require('./project')
const models = require('../_models')
const { expressApp, seedValues, truncateNonBase } = require('../../common/testing/sequelize')
const request = require('supertest')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  await truncateNonBase(models)
})

beforeEach(async () => {
  await models.sequelize.query('SELECT setval(\'users_id_seq\', (SELECT MAX(id) FROM users) + 1);')
})

afterEach(async () => {
  await truncateNonBase(models)
  await models.User.destroy({ where: { email: 'jonny@doe.com' } })
  await models.User.destroy({ where: { email: 'john1@doe.com' } })
})

afterAll(async () => {
  await models.sequelize.close()
})

describe('GET /projects/:id/users', () => {
  test('not found', async () => {
    console.warn = jest.fn()

    const response = await request(app).get('/1234/users')

    expect(response.statusCode).toBe(404)
    expect(console.warn).toHaveBeenCalled()
  })

  test('not have permission', async () => {
    const project = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Project Test' }
    await models.Project.create(project)
    console.warn = jest.fn()

    const response = await request(app).get(`/${project.id}/users`)

    expect(response.statusCode).toBe(403)
    expect(console.warn).toHaveBeenCalled()
  })

  test('have permission', async () => {
    const project = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleMember })

    const response = await request(app).get(`/${project.id}/users`)

    expect(response.statusCode).toBe(200)
    expect(response.body[0].firstname).toBe('James')
    expect(response.body[0].lastname).toBe('Bond')
    expect(response.body[0].email).toBe('jb@astonmartin.com')
    expect(response.body[0].role).toBe('Member')
    expect(response.body[0].permissions.includes('C')).toBeTruthy()
    expect(response.body[0].permissions.includes('R')).toBeTruthy()
    expect(response.body[0].permissions.includes('U')).toBeTruthy()
  })

  test('filter Owner', async () => {
    const project = { id: 'x456y', createdById: seedValues.primaryUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: project.createdById, project_id: project.id, role_id: seedValues.roleOwner })
    await models.UserProjectRole.create({ user_id: seedValues.otherUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    await models.UserProjectRole.create({ user_id: seedValues.anotherUserId, project_id: project.id, role_id: seedValues.roleMember })

    const response = await request(app).get(`/${project.id}/users`).query({ include_roles: ['Owner'] })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    const roles = response.body.map(u => u.role)
    expect(roles.includes('Owner')).toBeTruthy()
  })

  test('filter Owner and Admin', async () => {
    const project = { id: 'x456y', createdById: seedValues.primaryUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: project.createdById, project_id: project.id, role_id: seedValues.roleOwner })
    await models.UserProjectRole.create({ user_id: seedValues.otherUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    await models.UserProjectRole.create({ user_id: seedValues.anotherUserId, project_id: project.id, role_id: seedValues.roleMember })

    const response = await request(app).get(`/${project.id}/users`).query({ include_roles: ['Owner', 'Admin'] })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(2)
    const roles = response.body.map(u => u.role)
    expect(roles.includes('Owner')).toBeTruthy()
    expect(roles.includes('Admin')).toBeTruthy()
  })

  test('filter Member and Guest', async () => {
    const project = { id: 'x456y', createdById: seedValues.primaryUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: project.createdById, project_id: project.id, role_id: seedValues.roleOwner })
    await models.UserProjectRole.create({ user_id: seedValues.otherUserId, project_id: project.id, role_id: seedValues.roleMember })
    await models.UserProjectRole.create({ user_id: seedValues.anotherUserId, project_id: project.id, role_id: seedValues.roleGuest })

    const response = await request(app).get(`/${project.id}/users`).query({ include_roles: ['Member', 'Guest'] })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(2)
    const roles = response.body.map(u => u.role)
    expect(roles.includes('Member')).toBeTruthy()
    expect(roles.includes('Guest')).toBeTruthy()
  })

  test('filter Member and Guest but only Member exist', async () => {
    const project = { id: 'x456y', createdById: seedValues.primaryUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: project.createdById, project_id: project.id, role_id: seedValues.roleOwner })
    await models.UserProjectRole.create({ user_id: seedValues.otherUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    await models.UserProjectRole.create({ user_id: seedValues.anotherUserId, project_id: project.id, role_id: seedValues.roleMember })

    const response = await request(app).get(`/${project.id}/users`).query({ include_roles: ['Member', 'Guest'] })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    const roles = response.body.map(u => u.role)
    expect(roles.includes('Member')).toBeTruthy()
  })

  test('filter Admin but empty result', async () => {
    const project = { id: 'x456y', createdById: seedValues.primaryUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: project.createdById, project_id: project.id, role_id: seedValues.roleOwner })
    await models.UserProjectRole.create({ user_id: seedValues.anotherUserId, project_id: project.id, role_id: seedValues.roleMember })

    const response = await request(app).get(`/${project.id}/users`).query({ include_roles: ['Admin'] })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(0)
  })

  test('filter with permission C', async () => {
    const project = { id: 'x456y', createdById: seedValues.primaryUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: project.createdById, project_id: project.id, role_id: seedValues.roleOwner })
    await models.UserProjectRole.create({ user_id: seedValues.otherUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    await models.UserProjectRole.create({ user_id: seedValues.anotherUserId, project_id: project.id, role_id: seedValues.roleMember })
    await models.UserProjectRole.create({ user_id: seedValues.differentUserId, project_id: project.id, role_id: seedValues.roleGuest })

    const response = await request(app).get(`/${project.id}/users`).query({ permissions: ['C'] })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(3)
    const roles = response.body.map(u => u.role)
    expect(roles.includes('Owner')).toBeTruthy()
    expect(roles.includes('Admin')).toBeTruthy()
    expect(roles.includes('Member')).toBeTruthy()
  })

  test('filter with permission D', async () => {
    const project = { id: 'x456y', createdById: seedValues.primaryUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: project.createdById, project_id: project.id, role_id: seedValues.roleOwner })
    await models.UserProjectRole.create({ user_id: seedValues.otherUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    await models.UserProjectRole.create({ user_id: seedValues.anotherUserId, project_id: project.id, role_id: seedValues.roleMember })
    await models.UserProjectRole.create({ user_id: seedValues.differentUserId, project_id: project.id, role_id: seedValues.roleGuest })

    const response = await request(app).get(`/${project.id}/users`).query({ permissions: ['D'] })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(2)
    const roles = response.body.map(u => u.role)
    expect(roles.includes('Owner')).toBeTruthy()
    expect(roles.includes('Admin')).toBeTruthy()
  })

  test('filter with permission R', async () => {
    const project = { id: 'x456y', createdById: seedValues.primaryUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: project.createdById, project_id: project.id, role_id: seedValues.roleOwner })
    await models.UserProjectRole.create({ user_id: seedValues.otherUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    await models.UserProjectRole.create({ user_id: seedValues.anotherUserId, project_id: project.id, role_id: seedValues.roleMember })
    await models.UserProjectRole.create({ user_id: seedValues.differentUserId, project_id: project.id, role_id: seedValues.roleGuest })

    const response = await request(app).get(`/${project.id}/users`).query({ permissions: ['R'] })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(4)
    const roles = response.body.map(u => u.role)
    expect(roles.includes('Owner')).toBeTruthy()
    expect(roles.includes('Admin')).toBeTruthy()
    expect(roles.includes('Member')).toBeTruthy()
    expect(roles.includes('Guest')).toBeTruthy()
  })

  test('filter with permission C,D', async () => {
    const project = { id: 'x456y', createdById: seedValues.primaryUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: project.createdById, project_id: project.id, role_id: seedValues.roleOwner })
    await models.UserProjectRole.create({ user_id: seedValues.otherUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    await models.UserProjectRole.create({ user_id: seedValues.anotherUserId, project_id: project.id, role_id: seedValues.roleMember })
    await models.UserProjectRole.create({ user_id: seedValues.differentUserId, project_id: project.id, role_id: seedValues.roleGuest })

    const response = await request(app).get(`/${project.id}/users`).query({ permissions: ['C', 'D'] })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(2)
    const roles = response.body.map(u => u.role)
    expect(roles.includes('Owner')).toBeTruthy()
    expect(roles.includes('Admin')).toBeTruthy()
  })
})

describe('PUT /projects/:id/users', () => {
  test('Success Owner add user as Admin', async () => {
    const requestBody = {
      email: 'jonny@doe.com',
      role: 'Admin'
    }
    const project = { id: 'x456y', createdById: seedValues.primaryUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleOwner })
    await models.User.create({ email: requestBody.email, guid: 'a5e3aa4a-c05e-11ed-afa1-0242ac020302' })

    const response = await request(app).put(`/${project.id}/users`).send(requestBody)

    expect(response.statusCode).toBe(201)
    expect(response.body.email).toBe(requestBody.email)
    expect(response.body.role).toBe(requestBody.role)
  })

  test('Success Owner add user as Member', async () => {
    const requestBody = {
      email: 'jonny@doe.com',
      role: 'Member'
    }
    const project = { id: 'x456y', createdById: seedValues.primaryUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleOwner })
    await models.User.create({ email: requestBody.email, guid: 'a5e3aa4a-c05e-11ed-afa1-0242ac020302' })

    const response = await request(app).put(`/${project.id}/users`).send(requestBody)

    expect(response.statusCode).toBe(201)
    expect(response.body.email).toBe(requestBody.email)
    expect(response.body.role).toBe(requestBody.role)
  })

  test('Success Owner add user as Guest', async () => {
    const requestBody = {
      email: 'jonny@doe.com',
      role: 'Guest'
    }
    const project = { id: 'x456y', createdById: seedValues.primaryUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleOwner })
    await models.User.create({ email: requestBody.email, guid: 'a5e3aa4a-c05e-11ed-afa1-0242ac020302' })

    const response = await request(app).put(`/${project.id}/users`).send(requestBody)

    expect(response.statusCode).toBe(201)
    expect(response.body.email).toBe(requestBody.email)
    expect(response.body.role).toBe(requestBody.role)
  })

  test('Success Admin add user as Admin', async () => {
    const requestBody = {
      email: 'jonny@doe.com',
      role: 'Admin'
    }
    const project = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    await models.User.create({ email: requestBody.email, guid: 'a5e3aa4a-c05e-11ed-afa1-0242ac020302' })

    const response = await request(app).put(`/${project.id}/users`).send(requestBody)

    expect(response.statusCode).toBe(201)
    expect(response.body.email).toBe(requestBody.email)
    expect(response.body.role).toBe(requestBody.role)
  })

  test('Success Admin add user as Member', async () => {
    const requestBody = {
      email: 'jonny@doe.com',
      role: 'Member'
    }
    const project = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    await models.User.create({ email: requestBody.email, guid: 'a5e3aa4a-c05e-11ed-afa1-0242ac020302' })

    const response = await request(app).put(`/${project.id}/users`).send(requestBody)

    expect(response.statusCode).toBe(201)
    expect(response.body.email).toBe(requestBody.email)
    expect(response.body.role).toBe(requestBody.role)
  })

  test('Success Admin add user as Guest', async () => {
    const requestBody = {
      email: 'jonny@doe.com',
      role: 'Guest'
    }
    const project = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    await models.User.create({ email: requestBody.email, guid: 'a5e3aa4a-c05e-11ed-afa1-0242ac020302' })

    const response = await request(app).put(`/${project.id}/users`).send(requestBody)

    expect(response.statusCode).toBe(201)
    expect(response.body.email).toBe(requestBody.email)
    expect(response.body.role).toBe(requestBody.role)
  })

  test('Validation error Owner add user as Owner', async () => {
    const requestBody = {
      email: 'jonny@doe.com',
      role: 'Owner'
    }
    const project = { id: 'x456y', createdById: seedValues.primaryUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleOwner })
    await models.User.create({ email: requestBody.email, guid: 'a5e3aa4a-c05e-11ed-afa1-0242ac020302' })

    const response = await request(app).put(`/${project.id}/users`).send(requestBody)

    expect(response.statusCode).toBe(400)
  })

  test('Validation error Owner change Admin as Owner', async () => {
    const requestBody = {
      email: 'jonny@doe.com',
      role: 'Owner'
    }
    const project = { id: 'x456y', createdById: seedValues.primaryUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleOwner })
    const newUser = await models.User.create({ email: requestBody.email, guid: 'a5e3aa4a-c05e-11ed-afa1-0242ac020302' })
    await models.UserProjectRole.create({ user_id: newUser.id, project_id: project.id, role_id: seedValues.roleAdmin })

    const response = await request(app).put(`/${project.id}/users`).send(requestBody)

    expect(response.statusCode).toBe(400)
  })

  test('Forbidden Owner change himself as Member', async () => {
    const requestBody = {
      email: seedValues.primaryUserEmail,
      role: 'Member'
    }
    const project = { id: 'x456y', createdById: seedValues.primaryUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleOwner })

    const response = await request(app).put(`/${project.id}/users`).send(requestBody)

    expect(response.statusCode).toBe(403)
  })

  test('Validation error Owner change himself as Owner', async () => {
    const requestBody = {
      email: seedValues.primaryUserEmail,
      role: 'Owner'
    }
    const project = { id: 'x456y', createdById: seedValues.primaryUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleOwner })

    const response = await request(app).put(`/${project.id}/users`).send(requestBody)

    expect(response.statusCode).toBe(400)
  })

  test('Validation error Admin change himself as Owner', async () => {
    const requestBody = {
      email: seedValues.primaryUserEmail,
      role: 'Owner'
    }
    const project = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })

    const response = await request(app).put(`/${project.id}/users`).send(requestBody)

    expect(response.statusCode).toBe(400)
  })

  test('Validation error Admin add user as Owner', async () => {
    const requestBody = {
      email: 'jonny@doe.com',
      role: 'Owner'
    }
    const project = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    await models.User.create({ email: requestBody.email, guid: 'a5e3aa4a-c05e-11ed-afa1-0242ac020302' })

    const response = await request(app).put(`/${project.id}/users`).send(requestBody)

    expect(response.statusCode).toBe(400)
  })

  test('Validation error Admin change Member as Owner', async () => {
    const requestBody = {
      email: 'jonny@doe.com',
      role: 'Owner'
    }
    const project = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    const newUser = await models.User.create({ email: requestBody.email, guid: 'a5e3aa4a-c05e-11ed-afa1-0242ac020302' })
    await models.UserProjectRole.create({ user_id: newUser.id, project_id: project.id, role_id: seedValues.roleMember })

    const response = await request(app).put(`/${project.id}/users`).send(requestBody)

    expect(response.statusCode).toBe(400)
  })

  test('Forbidden Member try to add user', async () => {
    const requestBody = {
      email: 'jonny@doe.com',
      role: 'Member'
    }
    const project = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleMember })
    await models.User.create({ email: requestBody.email, guid: 'a5e3aa4a-c05e-11ed-afa1-0242ac020302' })

    const response = await request(app).put(`/${project.id}/users`).send(requestBody)

    expect(response.statusCode).toBe(403)
  })

  test('Forbidden Guest try to add user', async () => {
    const requestBody = {
      email: 'jonny@doe.com',
      role: 'Member'
    }
    const project = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleGuest })
    await models.User.create({ email: requestBody.email, guid: 'a5e3aa4a-c05e-11ed-afa1-0242ac020302' })

    const response = await request(app).put(`/${project.id}/users`).send(requestBody)

    expect(response.statusCode).toBe(403)
  })

  test('not found users', async () => {
    const requestBody = {
      email: 'john1@doe.com',
      role: 'Member'
    }
    const project = { id: 'x456y', createdById: seedValues.primaryUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleOwner })

    const response = await request(app).put(`/${project.id}/users`).send(requestBody)

    expect(response.statusCode).toBe(404)
  })
})

describe('DELETE /projects/:id/users', () => {
  test('delete member success', async () => {
    const requestBody = {
      email: seedValues.otherUserEmail
    }
    const project = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.otherUserId, project_id: project.id, role_id: seedValues.roleMember })
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })

    const response = await request(app).delete(`/${project.id}/users`).send(requestBody)

    expect(response.statusCode).toBe(200)
  })

  test('delete admin success', async () => {
    const requestBody = {
      email: seedValues.otherUserEmail
    }
    const project = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.otherUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })

    const response = await request(app).delete(`/${project.id}/users`).send(requestBody)

    expect(response.statusCode).toBe(200)
  })

  test('delete failed without access', async () => {
    const requestBody = {
      email: seedValues.otherUserEmail
    }
    const project = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.otherUserId, project_id: project.id, role_id: seedValues.roleOwner })

    const response = await request(app).delete(`/${project.id}/users`).send(requestBody)

    expect(response.statusCode).toBe(403)
  })

  test('member delete role failed', async () => {
    const requestBody = {
      email: seedValues.otherUserEmail
    }
    const project = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.otherUserId, project_id: project.id, role_id: seedValues.roleOwner })
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleMember })

    const response = await request(app).delete(`/${project.id}/users`).send(requestBody)

    expect(response.statusCode).toBe(403)
  })

  test('delete owner failed', async () => {
    const requestBody = {
      email: seedValues.primaryUserEmail
    }
    const project = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleOwner })

    const response = await request(app).delete(`/${project.id}/users`).send(requestBody)

    expect(response.statusCode).toBe(403)
    expect(response.body.message).toBe('Cannot remove Owner role')
  })
})

const request = require('supertest')
const routes = require('.')
const models = require('../_models')
const { expressApp, seedValues, truncateNonBase } = require('../../common/testing/sequelize')

const app = expressApp()

app.use('/', routes)

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
})

describe('POST /projects/:id/restore', () => {
  test('restores a soft-deleted project (with the pre-restore read as the negative control)', async () => {
    const project = { id: 'ft1', name: 'Forest village', createdById: seedValues.primaryUserId }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: project.createdById, project_id: project.id, role_id: seedValues.roleOwner })
    await models.Project.destroy({ where: { id: project.id } })

    // NEGATIVE CONTROL: if this read were not null, the restore assertion below
    // would be vacuous (a "restored" project that was never gone).
    expect(await models.Project.findByPk(project.id)).toBeNull()

    const response = await request(app).post(`/${project.id}/restore`)

    expect(response.statusCode).toBe(204)
    const restored = await models.Project.findByPk(project.id)
    expect(restored).not.toBeNull()
    expect(restored.name).toBe(project.name)
  })

  test('204 no-op when the project exists and is NOT deleted (the compensation end state)', async () => {
    // A compensation call that arrives after the delete never landed must be a
    // true no-op, not an error: "project is live" is exactly the state the
    // compensating caller wants.
    const project = { id: 'ft1', name: 'Forest village', createdById: seedValues.primaryUserId }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: project.createdById, project_id: project.id, role_id: seedValues.roleOwner })

    const response = await request(app).post(`/${project.id}/restore`)

    expect(response.statusCode).toBe(204)
    expect(await models.Project.findByPk(project.id)).not.toBeNull()
  })

  test('404 when the project does not exist at all', async () => {
    // "Not deleted" and "does not exist" must NOT share a status: for a
    // super/system-role caller (who skips the permission pre-check) a bare
    // restore() answers 0 rows for both, and the status would encode the
    // caller's privilege instead of the outcome (#685's lesson, applied to
    // the compensation route at birth rather than after an incident).
    console.warn = jest.fn()

    const response = await request(app).post('/ft1000/restore')

    expect(response.statusCode).toBe(404)
    expect(console.warn).toHaveBeenCalled()
  })

  test('forbidden by project member (and the project stays deleted)', async () => {
    const project = { id: 'ft2', name: 'Other forest village', createdById: seedValues.otherUserId }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleMember })
    await models.Project.destroy({ where: { id: project.id } })
    console.warn = jest.fn()

    const response = await request(app).post(`/${project.id}/restore`)

    expect(response.statusCode).toBe(403)
    expect(console.warn).toHaveBeenCalled()
    // The failed restore must not have leaked a resurrection:
    expect(await models.Project.findByPk(project.id)).toBeNull()
  })

  test('restorable by project admin', async () => {
    const project = { id: 'ft2', name: 'Other forest village', createdById: seedValues.otherUserId }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    await models.Project.destroy({ where: { id: project.id } })

    const response = await request(app).post(`/${project.id}/restore`)

    expect(response.statusCode).toBe(204)
    expect(await models.Project.findByPk(project.id)).not.toBeNull()
  })
})

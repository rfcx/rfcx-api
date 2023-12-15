'use strict'
const insertedUserAndProject = [] // [{ userId: 1, projectId: "aaaaaaaaaaa" }]
module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.sequelize.transaction(async transaction => {
            const [projectsCreatedBy] = await queryInterface.sequelize.query(`select id, created_by_id from projects`, { transaction })
            for (const projectAndOwner of projectsCreatedBy) {
                await queryInterface.sequelize.query(`insert into user_project_roles (user_id, project_id, role_id, created_at, updated_at) values (${projectAndOwner.created_by_id}, '${projectAndOwner.id}', 4, now(), now())`, { transaction })
                insertedUserAndProject.push({
                    userId: projectAndOwner.created_by_id,
                    projectId: projectAndOwner.id
                })
            }
        })
    },
    down: (queryInterface) => {
        return queryInterface.sequelize.transaction(async transaction => {
            for (const userAndProject of insertedUserAndProject) {
                await queryInterface.sequelize.query(`delete from user_project_roles where user_id = ${userAndProject.userId} and project_id = '${userAndProject.projectId}' and role_id = 4`, { transaction })
            }
        })
    }
}

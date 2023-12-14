'use strict'
const roleIds = [1, 2, 3, 4]
const roleList = ["Admin", "Member", "Guest", "Owner"]
const permissionList = ["C", "R", "U", "D"]
const insertedRoles = [] // [1, 2 ,3 ,4]
const insertedRolePermssions = [] // ["1,C", "1,R", "1,U", "1,D"]
module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.sequelize.transaction(async transaction => {
            // Find and Create roles (1, Admin), (2, Member), (3, Guest), (4, Owner)
            for (const id of roleIds) {
                console.log("select")
                const [[roleData]] = await queryInterface.sequelize.query(`select (id) from roles where id = ${id}`, { transaction })
                console.log(roleData)
                if (!roleData) {
                    console.log("insert")
                    const [[roleInsertData]] = await queryInterface.sequelize.query(`insert into roles (id, name, description) values (${id}, '${roleList[id - 1]}', '') returning id;`, { transaction })
                    insertedRoles.push(roleInsertData.id)
                }
            }
            for (const id of insertedRoles) {
                for (const permission of permissionList) {
                    const [[permissionData]] = await queryInterface.sequelize.query(`select (role_id) from role_permissions where role_id = ${id} and permission = '${permission}'`, { transaction })
                    if (!permissionData) {
                        await queryInterface.sequelize.query(`insert into role_permissions (role_id, permission) values (${id}, '${permission}')`, { transaction })
                        insertedRolePermssions.push(`${id},${permission}`)
                    }
                }
            }
        })
    },
    down: (queryInterface) => {
        return queryInterface.sequelize.transaction(async transaction => {
            for (const rolePerm of insertedRolePermssions) {
                const id = rolePerm.split(",")[0]
                const permission = rolePerm.split(",")[1]
                await queryInterface.sequelize.query(`DELETE FROM role_permissions WHERE role_id = ${id}' and permission = '${permission}'`, { transaction })
            }
            for (const id of insertedRoles) {
                await queryInterface.sequelize.query(`DELETE FROM roles WHERE id = ${id}`, { transaction })
            }
        })
    }
}

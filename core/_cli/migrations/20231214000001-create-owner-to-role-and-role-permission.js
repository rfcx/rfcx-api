'use strict'
const { ADMIN, MEMBER, GUEST, OWNER } = require('../../roles/dao')
const roleIds = [ADMIN, MEMBER, GUEST, OWNER] // [1, 2, 3, 4]
const roleList = ['Admin', 'Member', 'Guest', 'Owner']
const permissionList = [`${ADMIN},C`, `${ADMIN},R`, `${ADMIN},U`, `${ADMIN},D`, `${MEMBER},C`, `${MEMBER},R`, `${MEMBER},U`, `${GUEST},R`, `${OWNER},C`, `${OWNER},R`, `${OWNER},U`, `${OWNER},D`]
const insertedRoles = [] // [1, 2 ,3 ,4]
const insertedRolePermissions = [] // [{ roleId:1, permission:'C'}, { roleId:1, permission:'R'}]
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async transaction => {
      // Find and Create roles (1, Admin), (2, Member), (3, Guest), (4, Owner)
      for (const id of roleIds) {
        const [[roleData]] = await queryInterface.sequelize.query(`select (id) from roles where id = ${id}`, { transaction })
        if (!roleData) {
          const [[roleInsertData]] = await queryInterface.sequelize.query(`insert into roles (id, name, description) values (${id}, '${roleList[id - 1]}', '') returning id;`, { transaction })
          insertedRoles.push(roleInsertData.id)
        }
      }
      // Find and Create role permissions (1, C), (1, R), (1, U), (1, D), (2, C), (2, R), (2, U), (3, R), (4, C), (4, R), (4, U), (4, D)
      for (const permission of permissionList) {
        const roleId = permission.split(',')[0]
        const permissionValue = permission.split(',')[1]
        const [[permissionData]] = await queryInterface.sequelize.query(`select (role_id) from role_permissions where role_id = ${roleId} and permission = '${permissionValue}'`, { transaction })
        if (!permissionData) {
          await queryInterface.sequelize.query(`insert into role_permissions (role_id, permission) values (${roleId}, '${permissionValue}')`, { transaction })
          insertedRolePermissions.push({
            roleId: roleId,
            permission: permissionValue
          })
        }
      }
    })
  },
  down: (queryInterface) => {
    return queryInterface.sequelize.transaction(async transaction => {
      for (const rolePerm of insertedRolePermissions) {
        const id = rolePerm.roleId
        const permission = rolePerm.permission
        await queryInterface.sequelize.query(`delete from role_permissions where role_id = ${id}' and permission = '${permission}'`, { transaction })
      }
      for (const id of insertedRoles) {
        await queryInterface.sequelize.query(`delete from roles where id = ${id}`, { transaction })
      }
    })
  }
}

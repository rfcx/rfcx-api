'use strict'
const insertedUserAndStream = [] // [{ userId: 1, streamId: "aaaaaaaaaaa" }]
module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.sequelize.transaction(async transaction => {
            const [streamsCreatedBy] = await queryInterface.sequelize.query(`select id, created_by_id from streams`, { transaction })
            for (const streamAndOwner of streamsCreatedBy) {
                const [[userStreamRoleData]] = await queryInterface.sequelize.query(`select (role_id) from user_stream_roles where user_id = ${streamAndOwner.created_by_id} and stream_id = '${streamAndOwner.id}' and role_id = 4`, { transaction })
                if (!userStreamRoleData) {
                    await queryInterface.sequelize.query(`insert into user_stream_roles (user_id, stream_id, role_id, created_at, updated_at) values (${streamAndOwner.created_by_id}, '${streamAndOwner.id}', 4, now(), now())`, { transaction })
                    insertedUserAndStream.push({
                        userId: streamAndOwner.created_by_id,
                        streamId: streamAndOwner.id
                    })
                }
            }
        })
    },
    down: (queryInterface) => {
        return queryInterface.sequelize.transaction(async transaction => {
            for (const userAndStream of insertedUserAndStream) {
                await queryInterface.sequelize.query(`delete from user_stream_roles where user_id = ${userAndStream.userId} and stream_id = '${userAndStream.streamId}' and role_id = 4`, { transaction })
            }
        })
    }
}

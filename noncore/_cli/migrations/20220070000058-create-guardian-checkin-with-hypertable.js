'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    const type = queryInterface.sequelize.QueryTypes.RAW
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianCheckIns2', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        guid: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4
        },
        measured_at: {
          type: Sequelize.DATE(3),
          defaultValue: Sequelize.NOW,
          allowNull: false,
          primaryKey: true
        },
        queued_at: {
          type: Sequelize.DATE(3),
          defaultValue: Sequelize.NOW,
          allowNull: true
        },
        request_latency_api: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        request_latency_guardian: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        request_size: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        timezone_offset_minutes: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        guardian_queued_checkins: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        guardian_skipped_checkins: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        guardian_stashed_checkins: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        is_certified: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: true
        },
        guardian_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Guardians'
            },
            key: 'id'
          }
        },
        site_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: {
              tableName: 'GuardianSites'
            },
            key: 'id'
          }
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction })
      await queryInterface.sequelize.query("SELECT create_hypertable('\"GuardianCheckIns2\"', 'measured_at')", { type, transaction })
      await queryInterface.sequelize.query('INSERT INTO "GuardianCheckIns2" SELECT * FROM "GuardianCheckIns";', { type, transaction })
      await queryInterface.sequelize.query('SELECT setval(pg_get_serial_sequence(\'"GuardianCheckIns2"\', \'id\'), max(id)) FROM "GuardianCheckIns2";', { type, transaction })
      await queryInterface.addIndex('GuardianCheckIns2', ['guardian_id'], { transaction })
      await queryInterface.addIndex('GuardianCheckIns2', ['guid'], { transaction })
      await queryInterface.sequelize.query('ALTER TABLE "GuardianCheckIns" RENAME TO "GuardianCheckInsOld";', { type, transaction })
      await queryInterface.sequelize.query('ALTER TABLE "GuardianCheckIns2" RENAME TO "GuardianCheckIns";', { type, transaction })
      await deleteConstraints(queryInterface, transaction)
    })
  },
  down: (queryInterface, Sequelize) => {
    const type = queryInterface.sequelize.QueryTypes.RAW
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query('ALTER TABLE "GuardianCheckIns" RENAME TO "GuardianCheckIns2";', { type, transaction })
      await queryInterface.sequelize.query('ALTER TABLE "GuardianCheckInsOld" RENAME TO "GuardianCheckIns";', { type, transaction })
      await queryInterface.dropTable('GuardianCheckIns2', { transaction })
      await addConstraints(queryInterface, transaction)
    })
  }
}

async function deleteConstraints (queryInterface, transaction) {
  const type = queryInterface.sequelize.QueryTypes.RAW
  await queryInterface.sequelize.query('ALTER TABLE "GuardianAudio" DROP CONSTRAINT "GuardianAudio_check_in_id_fkey";', { type, transaction })
  await queryInterface.sequelize.query('ALTER TABLE "GuardianMetaBattery" DROP CONSTRAINT "GuardianMetaBattery_check_in_id_fkey";', { type, transaction })
  await queryInterface.sequelize.query('ALTER TABLE "GuardianMetaCPU" DROP CONSTRAINT "GuardianMetaCPU_check_in_id_fkey";', { type, transaction })
  await queryInterface.sequelize.query('ALTER TABLE "GuardianMetaDataTransfer" DROP CONSTRAINT "GuardianMetaDataTransfer_check_in_id_fkey";', { type, transaction })
  await queryInterface.sequelize.query('ALTER TABLE "GuardianMetaDateTimeOffsets" DROP CONSTRAINT "GuardianMetaDateTimeOffsets_check_in_id_fkey";', { type, transaction })
  await queryInterface.sequelize.query('ALTER TABLE "GuardianMetaGeoLocations" DROP CONSTRAINT "GuardianMetaGeoLocations_check_in_id_fkey";', { type, transaction })
  await queryInterface.sequelize.query('ALTER TABLE "GuardianMetaGeoPositions" DROP CONSTRAINT "GuardianMetaGeoPositions_check_in_id_fkey";', { type, transaction })
  await queryInterface.sequelize.query('ALTER TABLE "GuardianMetaLightMeter" DROP CONSTRAINT "GuardianMetaLightMeter_check_in_id_fkey";', { type, transaction })
  await queryInterface.sequelize.query('ALTER TABLE "GuardianMetaMessages" DROP CONSTRAINT "GuardianMetaMessages_check_in_id_fkey";', { type, transaction })
  await queryInterface.sequelize.query('ALTER TABLE "GuardianMetaMqttBrokerConnections" DROP CONSTRAINT "GuardianMetaMqttBrokerConnections_check_in_id_fkey";', { type, transaction })
  await queryInterface.sequelize.query('ALTER TABLE "GuardianMetaNetwork" DROP CONSTRAINT "GuardianMetaNetwork_check_in_id_fkey";', { type, transaction })
  await queryInterface.sequelize.query('ALTER TABLE "GuardianMetaOffline" DROP CONSTRAINT "GuardianMetaOffline_check_in_id_fkey";', { type, transaction })
  await queryInterface.sequelize.query('ALTER TABLE "GuardianMetaPower" DROP CONSTRAINT "GuardianMetaPower_check_in_id_fkey";', { type, transaction })
  await queryInterface.sequelize.query('ALTER TABLE "GuardianMetaSentinelAccelerometer" DROP CONSTRAINT "GuardianMetaSentinelAccelerometer_check_in_id_fkey";', { type, transaction })
  await queryInterface.sequelize.query('ALTER TABLE "GuardianMetaSentinelCompass" DROP CONSTRAINT "GuardianMetaSentinelCompass_check_in_id_fkey";', { type, transaction })
  await queryInterface.sequelize.query('ALTER TABLE "GuardianMetaSentinelPower" DROP CONSTRAINT "GuardianMetaSentinelPower_check_in_id_fkey";', { type, transaction })
}

async function addConstraints (queryInterface, transaction) {
  const type = queryInterface.sequelize.QueryTypes.RAW
  await queryInterface.sequelize.query(`ALTER TABLE "GuardianAudio"
    ADD CONSTRAINT "GuardianAudio_check_in_id_fkey" FOREIGN KEY (check_in_id)
    REFERENCES "GuardianCheckIns" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;`, { type, transaction })
  await queryInterface.sequelize.query(`ALTER TABLE "GuardianMetaBattery"
    ADD CONSTRAINT "GuardianMetaBattery_check_in_id_fkey" FOREIGN KEY (check_in_id)
    REFERENCES "GuardianCheckIns" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;`, { type, transaction })
  await queryInterface.sequelize.query(`ALTER TABLE "GuardianMetaCPU"
    ADD CONSTRAINT "GuardianMetaCPU_check_in_id_fkey" FOREIGN KEY (check_in_id)
    REFERENCES "GuardianCheckIns" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;`, { type, transaction })
  await queryInterface.sequelize.query(`ALTER TABLE "GuardianMetaDataTransfer"
    ADD CONSTRAINT "GuardianMetaDataTransfer_check_in_id_fkey" FOREIGN KEY (check_in_id)
    REFERENCES "GuardianCheckIns" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;`, { type, transaction })
  await queryInterface.sequelize.query(`ALTER TABLE "GuardianMetaDateTimeOffsets"
    ADD CONSTRAINT "GuardianMetaDateTimeOffsets_check_in_id_fkey" FOREIGN KEY (check_in_id)
    REFERENCES "GuardianCheckIns" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;`, { type, transaction })
  await queryInterface.sequelize.query(`ALTER TABLE "GuardianMetaGeoLocations"
    ADD CONSTRAINT "GuardianMetaGeoLocations_check_in_id_fkey" FOREIGN KEY (check_in_id)
    REFERENCES "GuardianCheckIns" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;`, { type, transaction })
  await queryInterface.sequelize.query(`ALTER TABLE "GuardianMetaGeoPositions"
    ADD CONSTRAINT "GuardianMetaGeoPositions_check_in_id_fkey" FOREIGN KEY (check_in_id)
    REFERENCES "GuardianCheckIns" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;`, { type, transaction })
  await queryInterface.sequelize.query(`ALTER TABLE "GuardianMetaLightMeter"
    ADD CONSTRAINT "GuardianMetaLightMeter_check_in_id_fkey" FOREIGN KEY (check_in_id)
    REFERENCES "GuardianCheckIns" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;`, { type, transaction })
  await queryInterface.sequelize.query(`ALTER TABLE "GuardianMetaMessages"
    ADD CONSTRAINT "GuardianMetaMessages_check_in_id_fkey" FOREIGN KEY (check_in_id)
    REFERENCES "GuardianCheckIns" (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;`, { type, transaction })
  await queryInterface.sequelize.query(`ALTER TABLE "GuardianMetaMqttBrokerConnections"
      ADD CONSTRAINT "GuardianMetaMqttBrokerConnections_check_in_id_fkey" FOREIGN KEY (check_in_id)
      REFERENCES "GuardianCheckIns" (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION;`, { type, transaction })
  await queryInterface.sequelize.query(`ALTER TABLE "GuardianMetaNetwork"
      ADD CONSTRAINT "GuardianMetaNetwork_check_in_id_fkey" FOREIGN KEY (check_in_id)
      REFERENCES "GuardianCheckIns" (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION;`, { type, transaction })
  await queryInterface.sequelize.query(`ALTER TABLE "GuardianMetaOffline"
      ADD CONSTRAINT "GuardianMetaOffline_check_in_id_fkey" FOREIGN KEY (check_in_id)
      REFERENCES "GuardianCheckIns" (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION;`, { type, transaction })
  await queryInterface.sequelize.query(`ALTER TABLE "GuardianMetaPower"
      ADD CONSTRAINT "GuardianMetaPower_check_in_id_fkey" FOREIGN KEY (check_in_id)
      REFERENCES "GuardianCheckIns" (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION;`, { type, transaction })
  await queryInterface.sequelize.query(`ALTER TABLE "GuardianMetaSentinelAccelerometer"
      ADD CONSTRAINT "GuardianMetaSentinelAccelerometer_check_in_id_fkey" FOREIGN KEY (check_in_id)
      REFERENCES "GuardianCheckIns" (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION;`, { type, transaction })
  await queryInterface.sequelize.query(`ALTER TABLE "GuardianMetaSentinelCompass"
      ADD CONSTRAINT "GuardianMetaSentinelCompass_check_in_id_fkey" FOREIGN KEY (check_in_id)
      REFERENCES "GuardianCheckIns" (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION;`, { type, transaction })
  await queryInterface.sequelize.query(`ALTER TABLE "GuardianMetaSentinelPower"
      ADD CONSTRAINT "GuardianMetaSentinelPower_check_in_id_fkey" FOREIGN KEY (check_in_id)
      REFERENCES "GuardianCheckIns" (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION;`, { type, transaction })
}

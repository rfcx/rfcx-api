'use strict'
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction()
    const type = queryInterface.sequelize.QueryTypes.RAW
    try {
      await queryInterface.sequelize.query(
        'ALTER TABLE public.stream_segments DROP CONSTRAINT IF EXISTS stream_segments_stream_source_file_id_fkey;',
        { type, transaction }
      )
      await queryInterface.sequelize.query(
        `ALTER TABLE public.stream_segments
        ADD CONSTRAINT stream_segments_stream_source_file_id_fkey FOREIGN KEY (stream_source_file_id)
        REFERENCES public.stream_source_files (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE;`,
        { type, transaction }
      )
      await queryInterface.sequelize.query(
        `DELETE FROM stream_source_files a USING stream_source_files b
        WHERE a.id > b.id AND a.stream_id = b.stream_id AND a.sha1_checksum = b.sha1_checksum;`,
        { type, transaction }
      )
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS public.stream_source_files_stream_id_and_sha;',
        { type, transaction }
      )
      await queryInterface.sequelize.query(
        'CREATE UNIQUE INDEX stream_source_files_stream_id_and_sha ON stream_source_files (stream_id, sha1_checksum);',
        { type, transaction }
      )
      await queryInterface.sequelize.query(
        'ALTER TABLE stream_source_files ADD CONSTRAINT stream_source_files_stream_id_and_sha_unique UNIQUE USING INDEX stream_source_files_stream_id_and_sha;',
        { type, transaction }
      )
      await transaction.commit()
    } catch (err) {
      await transaction.rollback()
      throw err
    }
  },
  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction()
    const type = queryInterface.sequelize.QueryTypes.RAW
    try {
      await queryInterface.sequelize.query(
        'ALTER TABLE stream_source_files DROP CONSTRAINT IF EXISTS stream_source_files_stream_id_and_sha_unique;',
        { type, transaction }
      )
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS stream_source_files_stream_id_and_sha;',
        { type, transaction }
      )
      await queryInterface.sequelize.query(
        'CREATE INDEX stream_source_files_stream_id_and_sha ON stream_source_files (stream_id, sha1_checksum);',
        { type, transaction }
      )
      await queryInterface.sequelize.query(
        'ALTER TABLE public.stream_segments DROP CONSTRAINT IF EXISTS stream_segments_stream_source_file_id_fkey;',
        { type, transaction }
      )
      await queryInterface.sequelize.query(
        `ALTER TABLE public.stream_segments
        ADD CONSTRAINT stream_segments_stream_source_file_id_fkey FOREIGN KEY (stream_source_file_id)
        REFERENCES public.stream_source_files (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION;`,
        { type, transaction }
      )
      await transaction.commit()
    } catch (err) {
      await transaction.rollback()
      throw err
    }
  }
}

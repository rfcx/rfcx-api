'use strict'

/**
 * stream_source_files.uploaded_by_id — WHO uploaded a file (rfcx-local
 * OPEN-ITEMS 375, user-attribution program, design section 4 REVISED).
 *
 * The uploader is known at ingest (ingest.stream_uploads.user_id, 100 %
 * populated) and was discarded at persistence; the source table is DROP
 * PARTITIONed every 14 days, so the loss was permanent. This column is the
 * canonical home: one file = one row = one uploader.
 *
 * IDEMPOTENT ON PURPOSE: the column was added to production PG by hand under a
 * named operator GO (2026-09-22 11:30 EDT, catalog-only, 11.8 ms on 182.7 M
 * rows) BEFORE this code shipped, so the code could never race the schema.
 * This migration exists so a fresh environment matches prod; on prod it must
 * be a no-op, hence the IF NOT EXISTS.
 *
 * Nullable, no default, NO BACKFILL: history is unrecoverable and NULL is the
 * honest value (pre-column / unresolved bulk-ingest identity / no acting user).
 * Never a sentinel user.
 */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      'ALTER TABLE public.stream_source_files ADD COLUMN IF NOT EXISTS uploaded_by_id INTEGER NULL'
    )
    await queryInterface.sequelize.query(
      'COMMENT ON COLUMN public.stream_source_files.uploaded_by_id IS ' +
      "'The user who uploaded this file (core users.id), carried from ingest.stream_uploads.user_id at persistence. " +
      'NULL = uploaded before 2026-09-22 (unrecoverable, not backfilled), or the uploader identity did not resolve to a users row (bulk/service ingest), ' +
      "or written by a path with no acting user. Never a sentinel. rfcx-local OPEN-ITEMS 375; operator GO 2026-09-22 11:30 naming this table.'"
    )
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      'ALTER TABLE public.stream_source_files DROP COLUMN IF EXISTS uploaded_by_id'
    )
  }
}

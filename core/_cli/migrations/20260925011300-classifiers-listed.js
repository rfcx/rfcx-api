'use strict'

/**
 * classifiers.listed — whether a classifier is offered when choosing a model for a NEW job.
 *
 * GET /classifiers?latest=true returns only the newest LISTED version per model name, so setting listed=false on a
 * version retires it (e.g. a regression) and surfaces the previous listed version; nothing is deleted and existing
 * jobs/detections keep their classifier ids.
 *
 * IDEMPOTENT ON PURPOSE: added to production PG by hand under an operator GO (goifirr 2026-09-25 01:08 EDT;
 * catalog-only on PG 14 with a constant default, ~3 ms on 69 rows) before this code shipped, so the code never races
 * the schema. On prod this is a no-op; it exists so a fresh environment matches.
 */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      'ALTER TABLE public.classifiers ADD COLUMN IF NOT EXISTS listed BOOLEAN NOT NULL DEFAULT true'
    )
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query('ALTER TABLE public.classifiers DROP COLUMN IF EXISTS listed')
  }
}

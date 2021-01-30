# API Deployment Notes

## v1.0.1

- Delete `20200708000001-create-detection-review.js` from `sequelize.migrations` table in TimescaleDB.
- Delete `20200708000001-create-detection-review copy.js` from `sequelize.migrations` table in TimescaleDB.
- Drop `public.detection_reviews` table in TimescaleDB.
- Run `npm run sync-timescale` to apply `20210130000001-add-is-suggested-is-opposite-to-annotaions` and `20210130000002-change-freq-min-freq-max-on-annotations` migrations.

## v1.0.0

_None_

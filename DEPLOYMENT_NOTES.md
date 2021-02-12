# API Deployment Notes

## v1.0.4

_None_

## v1.0.3

_None_

## v1.0.2

_None_

## v1.0.1

- Delete `20200708000001-create-detection-review.js` from `sequelize.migrations` table in TimescaleDB.
- Delete `20200708000001-create-detection-review copy.js` from `sequelize.migrations` table in TimescaleDB.
- Drop `public.detection_reviews` table in TimescaleDB.
- Run `npm run sync-timescale` to apply the following migrations:
  - `20210130000001-add-is-manual-is-positive-to-annotaions`
  - `20210130000002-change-freq-min-freq-max-on-annotations`
  - `20210130000003-drop-id-on-detections`
  - `20210130000005-drop-detecton-ids-on-events`

## v1.0.0

_None_
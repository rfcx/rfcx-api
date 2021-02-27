# API Deployment Notes

## v1.0.11

_None_

## v1.0.10

_None_

## v1.0.9

_None_

## v1.0.8

- Add `MEDIA_CACHE_ENABLED` env var and set it to true

## v1.0.7

_None_

## v1.0.6

- Create rows in `classifier_outputs` for every classifier currently in production
- Run `npm run sync-timescale` to apply the following migrations:
  - `20210211170430-add-ignore-threshold-on-classifier-output`

## v1.0.5

_None_

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

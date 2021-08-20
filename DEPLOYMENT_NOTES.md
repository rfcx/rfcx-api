# API Deployment Notes

## v1.0.25
- Look out for errors related to the changes to the ingress annotations 
  (due to CE-943).

## v1.0.24
- Run `npm run sync-timescale` to apply the following migrations:
  - `20210805150100-add-stream-timezone-column`
- Check that Jenkins is using the correct Jenkinsfile and update if necessary.
  (Note that if it needs updating then the previous work to "apply" yaml
  config on deploy might be untested.)

## v1.0.22
- Deploy Explorer updates from `bug/CE-831-upload-permissions` branch
- Add `STREAM_TOKEN_SALT` env var and set it to some long random string

## v1.0.21

- Run `npm run sync-timescale` to apply the following migrations:
  - `20210523191500-create-classifier-index`
  - `20210524175900-create-classifier-output-classifier-id-index`
  - `20210527000001-convert-from-real-to-double-on-project-steam`
  - `20210603000001-add-platform-to-project`

## v1.0.18

- Run `npm run sync-timescale` to apply migrations (deletes the stream_assets table)
- Expect some errors from Explorer due to removal of `is_deleted`, `is_public`, and `created_by=collaborators` on `GET /streams`

## v1.0.16

- Run `npm run sync-timescale` to apply the following migrations:
  - `20210223000000-update-indexes-and-constraints-for-source-files`
  - `20210305141400-change-active-to-deployed-and-add-platform-on-classifier-deployments`

## v1.0.8

- Add `MEDIA_CACHE_ENABLED` env var and set it to true

## v1.0.6

- Create rows in `classifier_outputs` for every classifier currently in production
- Run `npm run sync-timescale` to apply the following migrations:
  - `20210211170430-add-ignore-threshold-on-classifier-output`

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

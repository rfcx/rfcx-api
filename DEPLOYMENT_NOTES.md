# API Deployment Notes

## 1.3.1
- Run `npm run migrate:core` to apply migrations:
  - `20230727000001-create-classifier-job-streams`

## 1.3.0
- Run `npm run migrate:core` to apply migrations:
  - `20230228000001-change-detections-table`
  - `20230228000002-create-detection-reviews-table`
  - `20230228000003-create-classifier-processed-segments-table`

## 1.2.1
- Run `npm run migrate:core` to apply migrations: `20220823000001-add-parameters-to-classifiers`

## 1.2.0
- Create `noncore` database in Timescale
- Add `NONCORE_DB_NAME` with new database name
- Give user which is specified in `POSTGRES_USER` env var permissions to access `NONCORE_DB_NAME`
- Rename `POSTGRES_DB` env var to `CORE_DB_NAME`
- Delete `DB_HOSTNAME`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `DB_PORT` from config and secrets
- Export data from MySQL with the following constraints:
  - Exclude `organization`, `user_id` from `GuardianSites` table

## 1.1.9
- Check that guardian software request works fine
- Check that `last_audio_sync` column is updated on guardian checkin
- Check that `last_battery_internal` and `last_battery_main` columns are updated on guardian mqtt checkin
- Check that `last_battery_internal` and `last_battery_main` columns are updated on guardian satellite checkin
- Check that `last_battery_internal` and `last_battery_main` columns are updated on guardian software request
- Check that `v2/guardians` endpoint returns correct data for `last_audio`, `battery_percent_internal` and `battery_percent`
- Run `npm run migrate:core` to apply the following migrations:
  - `20220607000002-create-classifier-jobs`
  - `20220609000001-add-is-public-to-classifiers`

## 1.1.8
- Check that public website contact form works fine

## 1.1.4
- Check that POST-Login auth0 webhook /users/new-login works correctly
- Check that all features of the Android Stream app work fine
- Run `npm run migrate:noncore` to apply the following migrations:
  - `20220407000001-add-project_id-to-guardian`
  - `20220408000001-add-timezone-to-guardian`
- Run `npm run migrate:core` to apply the following migrations:
  - `20220421000001-enable-auto-increment-users`

## 1.1.3
- Remove configuration from Jenkins for "Core, Media, MQTT APIs" _before_ merging to master
- Run `npm run migrate:noncore` for new migration
- Delete api_production, api_staging, api_testing repositories from ECR _after_ deployment
- Delete api-secrets and api-rabbitmq-secrets _after_ deployment

## 1.1.2
- Update Prediction Service to stop using legacy mode
- Delete AI models page from the Guardian Monitoring
- Delete redis deployment in k8s
- Run `npm run sync-mysql` for new migration
- Run `update Guardians set last_ping = (select max(measured_at) from GuardianMetaBattery where guardian_id = Guardians.id) where last_ping is null;` after migrations
- Delete Kubernetes resources:
  - api, api-service, api-ingress, api-config-map
  - api-mqtt, api-mqtt-service, api-mqtt-ingress, api-mqtt-configmap
  - api-media, api-media-configmap, api-media-ingress, api-media-service
- Change http://api-service.staging.svc.cluster.local to http://core-api-service.staging.svc.cluster.local in Guardian API, Device API and Ingest Service
- Change http://api-service.production.svc.cluster.local to http://core-api-service.production.svc.cluster.local in Guardian API, Device API and Ingest Service

## 1.1.1
- Run `npm run sync-mysql` for new migration

## 1.1.0
- Significant refactoring/moved files - expect import errors

## 1.0.31
- Run `npm run sync-mysql` for new migration

## 1.0.27
- Add `Users` and `UserTokens` a row for Swarm user - contact @Frongs for the information

## 1.0.26
- Run `npm run sync-mysql` to create GuardianMetaSegmentsGroupLog table.

## 1.0.25
- Look out for errors related to the changes to the ingress annotations
  (due to CE-943).
- Run `npm run sync-mysql` to apply the following migrations:
  - `20210830000001-add-stream-id-to-guardian`

## 1.0.24
- Run `npm run sync-timescale` to apply the following migrations:
  - `20210805150100-add-stream-timezone-column`
- Check that Jenkins is using the correct Jenkinsfile and update if necessary.
  (Note that if it needs updating then the previous work to "apply" yaml
  config on deploy might be untested.)

## 1.0.22
- Deploy Explorer updates from `bug/CE-831-upload-permissions` branch
- Add `STREAM_TOKEN_SALT` env var and set it to some long random string

## 1.0.21

- Run `npm run sync-timescale` to apply the following migrations:
  - `20210523191500-create-classifier-index`
  - `20210524175900-create-classifier-output-classifier-id-index`
  - `20210527000001-convert-from-real-to-double-on-project-steam`
  - `20210603000001-add-platform-to-project`

## 1.0.18

- Run `npm run sync-timescale` to apply migrations (deletes the stream_assets table)
- Expect some errors from Explorer due to removal of `is_deleted`, `is_public`, and `created_by=collaborators` on `GET /streams`

## 1.0.16

- Run `npm run sync-timescale` to apply the following migrations:
  - `20210223000000-update-indexes-and-constraints-for-source-files`
  - `20210305141400-change-active-to-deployed-and-add-platform-on-classifier-deployments`

## 1.0.8

- Add `MEDIA_CACHE_ENABLED` env var and set it to true

## 1.0.6

- Create rows in `classifier_outputs` for every classifier currently in production
- Run `npm run sync-timescale` to apply the following migrations:
  - `20210211170430-add-ignore-threshold-on-classifier-output`

## 1.0.1

- Delete `20200708000001-create-detection-review.js` from `sequelize.migrations` table in TimescaleDB.
- Delete `20200708000001-create-detection-review copy.js` from `sequelize.migrations` table in TimescaleDB.
- Drop `public.detection_reviews` table in TimescaleDB.
- Run `npm run sync-timescale` to apply the following migrations:
  - `20210130000001-add-is-manual-is-positive-to-annotaions`
  - `20210130000002-change-freq-min-freq-max-on-annotations`
  - `20210130000003-drop-id-on-detections`
  - `20210130000005-drop-detecton-ids-on-events`

## 1.0.0

_None_

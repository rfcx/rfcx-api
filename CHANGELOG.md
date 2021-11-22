## 1.0.27 (2021-11-xx)

### Features
* **guardian:** Add authenticate to `POST /v2/guardians/swm` endpoint to use old way authentication
* **guardian:** Bypass the test message from Swarm connection test

## 1.0.26 (2021-11-20)

### Features
* **guardian:** Log assembled guardian meta segments in a separate table for debugging

### Bug Fixes
* **guardian:** Fix assemble segments function when there are 10 or more segments (incorrect sorting causing unzip fail)


## 1.0.25 (2021-11-04)

### Features
* **guardian:** Add `stream_id` to `Guardians` table
* **guardian:** Guardian registration won't create stream in Core and Arbimon
* **guardian:** Audios from Guardian won't be ingested if there is no `stream_id`
* **guardian:** Guardian v2 endpoint to update information
* **guardian:** Create alternate endpoint to get all latest software information without guid given
* **guardian:** Store Swarm diagnostics for background_rssi and satellite_rssi in the meta network table
* **guardian:** Add new endpoint for Swarm webhook to send segment message
* **guardian:** Decode base64 string from Swarm to match correct format of Guardian segment
* **core:** Add `id` params to create stream endpoint


## 1.0.24-hotfix.5 (2021-10-25)

### Features
* **core:** broadcast SNS message regarding new event ([CE-1410](https://jira.rfcx.org/browse/CE-1410))


## 1.0.24-hotfix.4 (2021-10-23)

### Bug Fixes
* **core:** fix permission logic for project owner ([CE-1301](https://jira.rfcx.org/browse/CE-1301))


## 1.0.24-hotfix.3 (2021-10-07)

### Features
* **internal:** add endpoint for auth0 post-login webhook ([CE-1437](https://jira.rfcx.org/browse/CE-1437))


## 1.0.24-hotfix.2 (2021-09-21)

### Bug Fixes
* **media:** don't use 'between' for segments search ([CE-1372](https://jira.rfcx.org/browse/CE-1372))


## 1.0.24-hotfix.1 (2021-09-13)

### Bug Fixes
* **internal:** Fix /internal/ai-hub/detections return all streams from projects if projects were given


## 1.0.24 (2021-08-24)

### Features
* **core:** Add permission field for project listing
* **core:** Add `timezone` column to `streams` table([CE-1168](https://jira.rfcx.org/browse/CE-1168))
* **core:** Segment endpoint supporting prediction service to get a whole segment file efficiently ([CE-1166](https://jira.rfcx.org/browse/CE-1166))
* **core:** Standardised segment endpoint security

### Bug Fixes
* **core:** Fixes Explorer bug showing public detections on console page - Clustered detections should not include detections from public streams by default ([CE-684](https://jira.rfcx.org/browse/CE-684))
* **guardian:** Guardian instruction ids were sent as numbers instead of strings, causing the Guardian to fail when parsing and not purge it from the exchange log.


## 1.0.23-hotfix.0 (2021-08-20)

### Features
* **media:** Set bitrate explicitly when mp3 is requested ([CE-1255](https://jira.rfcx.org/browse/CE-1255))


## 1.0.23 (2021-08-02)

### Features
* **internal:** Support for message queue on segment creation ([CE-749](https://jira.rfcx.org/browse/CE-749)) ([CE-747](https://jira.rfcx.org/browse/CE-747))
* **tasks:** Message queue consumer for segment creation that queues the prediction service ([CE-871](https://jira.rfcx.org/browse/CE-871))
* **core:** Add unique constraint to user_project_roles table
* **internal:** Update /internal/ai-hub/detections endpoint to include user allowed streams permission when not send streams or projects query params ([CE-1154](https://jira.rfcx.org/browse/CE-1154))

### Bug Fixes
* **core:** Guest user can not create stream in a project ([CE-961](https://jira.rfcx.org/browse/CE-961))


## 1.0.22-hotfix.1 (2021-07-29)

### Bug Fixes
* **core:** MySQL - TimescaleDB user sync is searching for `email` OR `guid` instead of `email` AND `guid`

## 1.0.22-hotfix.0 (2021-06-16)

### Bug Fixes
* **core:** System user or stream-token user can get detections for selected streams without roles


## 1.0.22 (2021-06-16)

### Features
* **core:** Implement new "stream-token" authorization strategy and apply it for stream assets and stream detections endpoints ([CE-225](https://jira.rfcx.org/browse/CE-225))
* **media:** Implement frequency clipping feature for spectrograms ([CE-227](https://jira.rfcx.org/browse/CE-227))
* **media:** Implement frequency filtering feature for audios ([CE-227](https://jira.rfcx.org/browse/CE-227))
* **core:** Move /streams/{id}/permissions from Internal into Core ([CE-831](https://jira.rfcx.org/browse/CE-831))

### Bug Fixes
* **internal:** GET /internal/ai-hub/detections rely on projects/streams user permission ([CE-810](https://jira.rfcx.org/browse/CE-810))

## 1.0.21 (2021-06-07)

### Features
* **core:** Update GET /classifications to be able to limit the classifications result by classifiers by classifiers ([CE-703](https://jira.rfcx.org/browse/CE-703))
* **core:** Update GET /clustered-detections to be able to query the detections by giving the classifier values ([CE-702](https://jira.rfcx.org/browse/CE-702))
* **core:** Add ability to filter streams/projects/organizations by permission ([CE-655](https://jira.rfcx.org/browse/CE-655))
* **core:** Update GET /clustered-detections to be able to query the detections by giving multiple stream values ([CE-811](https://jira.rfcx.org/browse/CE-811))

### Performance Improvements
* **legacy:** Do not generate anonymous token for audio json data; Reduce models which we include for GuardianAudio ([CE-795](https://jira.rfcx.org/browse/CE-795))

### Bug Fixes
* **core:** POST /classifiers save correct external id
* **core:** Convert type of latitude, longitude and altitude back to DOUBLE to improve precision on the location ([CE-813](https://jira.rfcx.org/browse/CE-813))
* **core:** Handle saving enddate from different platform on new classifier deployment from PATCH /classifiers ([CE-808](https://jira.rfcx.org/browse/CE-808))


## 1.0.20-hotfix.0 (2021-??-??)

### Bug Fixes
**internal:** PATCH /internal/prediction/classifier-deployments/:id not update the deployed status


## 1.0.20 (2021-05-21)

### Features
* **internal:** GET /interna/ai-hub/reviews endpoints getting the detections query by review/unreview/positive/negative status ([CE-385](https://jira.rfcx.org/browse/CE-385))
* **internal:** Update GET /internal/predictions/classifier-deployments/:id to return model url ([CE-487](https://jira.rfcx.org/browse/CE-487))
* **internal:** Update GET /internal/predictions/classifier-deployments to return full attributes when given classifier fields
* **core:** Add recording filename to meta parameter for the Arbimon recording object ([CE-686](https://jira.rfcx.org/browse/CE-686))

### Bug Fixes
* **core:** Detections endpoint only returning public stream detections [CE-382](https://jira.rfcx.org/browse/CE-382)


## 1.0.19-hotfix.0 (2021-05-19)

### Bug Fixes
* **core:** Fix issue in getPermissions function caused by missing attribute


## 1.0.19 (2021-05-13)

### Features
* **core:** Add meta parameter for the Arbimon recording object ([CE-495](https://jira.rfcx.org/browse/CE-495))
* **core:** Add PATCH /event/:id endpoint
* **core:** Endpoints for adding getting and deleting project permission.
* **internal:** Add Cognition Service endpoint for getting aggregated detections

### Bug Fixes

* **core:** Get events not supporting streams parameter correctly
* **core:** Get event strategies endpoint failure to return
* **internal:** Fix GET /interna/ai-hub/reviews endpoints for annotations query by classification values ([CE-597](https://jira.rfcx.org/browse/CE-597))
* **internal:** Fix project name changed in Arbimon but not synced to Core API
* **legacy:** Create or update stream on guardian update; Send guardian updates to Arbimon ([CE-565](https://jira.rfcx.org/browse/CE-565))


## 1.0.18 (2021-04-28)

### Features
* **core:** Detection endpoints use classifier output mappings.
* **core:** Stream assets are no longer stored in Core.
* **core:** Send emails and push notifications on event creation ([CE-59](https://jira.rfcx.org/browse/CE-59))
* **core:** Fix project id not be sent to Arbimon and cause site creation on wrong project
* **core:** Add Min/Max Latitude/Longitude attributes to project
* **core:** Create event endpoint supports saving to neo4j for Tembe project
* **core:** Delete unused stream_source_file and stream_segment endpoints ([CE-469](https://jira.rfcx.org/browse/CE-469))
* **guardian:** Save detections sent over MQTT/SMS/SBD
* **internal:** Refactor /prediction-deployer/classifier-deployments endpoints to /prediction/classifier-deployments endpoints
* **internal:** Add united endpoint for stream_source_file and stream_segment creation ([CE-469](https://jira.rfcx.org/browse/CE-469))
* **internal:** Call Arbimon recordings endpoint from united endpoint of stream_source_file and stream_segment creation ([CE-469](https://jira.rfcx.org/browse/CE-469))
* **internal:** Add stream permissions endpoint
* **internal:** GET /interna/ai-hub/reviews endpoints for getting detections left join with annotations

### Bug Fixes
* **core:** update PATCH /classifier endpoint to save previous `deployment_parameters` configuration when given only status change ([CE-344](https://jira.rfcx.org/browse/CE-344))
* **media:** Add additional check for overlapping segments in assets


## 1.0.17-hotfix.4 (2021-04-13)

### Features
* **guardian:** Save detections sent over MQTT


## 1.0.17-hotfix.3 (2021-04-02)

### Bug Fixes
* **legacy:** Check for duplicate audio files in /v1/guardians/:id/checkins endpoint


## 1.0.17-hotfix.2 (2021-03-27)

### Bug Fixes
* **legacy:** Fix v1/guardians/register endpoint


## 1.0.17-hotfix.1 (2021-03-20)

### Bug Fixes
* **core:** Fix incorrect classifier id on /internal/prediction/detections. Switch to using output class names instead of classification values for prediction service.


## 1.0.17-hotfix.0 (2012-03-18)

### Bug Fixes
* **global:** Remove toobusy.js to avoid impact on autoscaling. Set connection pool for postgres up to 20 connections.


## 1.0.17 (2012-03-15)

### Features
* **core:** Shorten /streams/id/detections body payload to 5 items ([CE-310](https://jira.rfcx.org/browse/CE-310))

### Bug Fixes
* **internal:** Fix parameters name for `start` and `end` in /prediction-deployer/classifier-deployments query


## 1.0.15-hotfix.0 (2021-03-13)

### Bug Fixes
* **core:** POST /v2/guardians/register endpoint uses correct data for Arbimon site creation


## 1.0.16 (2021-03-12)

### Features
* **internal:** GET /prediction-deployer/classifier-deployments/:id endpoint for getting individual classifier deployment information by id
* **internal:** GET /prediction-deployer/classifier-deployments endpoint for getting the list of latest deployment information of each classifier id ([CE-277](https://jira.rfcx.org/browse/CE-277))
* **internal:** PATCH /prediction-deployer/classifier-deployments/:id endpoint for updating deployed status ([CE-277](https://jira.rfcx.org/browse/CE-277))

### Bug Fixes
* **core:** Refactor stream source file creation endpoint to avoid duplicates ([CE-179](https://jira.rfcx.org/browse/CE-179))

### Other
* **core:** Refactor setup script
* **core:** Update stream_segments and stream_source_files tables to have unique constraint on stream_id and checksum ([CE-179](https://jira.rfcx.org/browse/CE-179))


## 1.0.15 (2021-03-05)

### Bug Fixes
* **core:** GET /stream-source-files endpoint can be used by `systemUser`


## 1.0.14 (2021-03-03)

### Features
* **core:** Add sort param to streams `GET`
* **core:** Implement GET /detections with required `start` and `end` query and optional `streams`, `classifications`, `min_confidence`, `limit`, and `offset` ([CE-161](https://jira.rfcx.org/browse/CE-161))


## 1.0.13 (2021-03-02)

### Features
* **core:** Rework streams-sites unification ([CE-174](https://jira.rfcx.org/browse/CE-174))


## 1.0.12 (2021-02-28)

### Features
* **core:** Filter streams by `updated_after`


## 1.0.11 (2021-02-27)

### Features
* **core:** Call Arbimon endpoint on Stream update call ([CE-203](https://jira.rfcx.org/browse/CE-203))


## 1.0.10 (2021-02-25)

### Bug Fixes
* **media:** Output single channel audio


## 1.0.9 (2021-02-25)

### Bug Fixes
* **core:** On `GET /streams`, when created_by is not set then return all (non-public) accessible sites ([CE-183](https://jira.rfcx.org/browse/CE-183))


<a name="1.0.8"></a>
## 1.0.8 (2021-02-24)

### Features
* **media:** Use `ffmpeg` instead of `sox` for audio processing ([CS-439](https://jira.rfcx.org/browse/CS-439))
* **core:** Add GET /streams/{id}/stream-source-files endpoint ([CE-31](https://jira.rfcx.org/browse/CE-31))

### Bug Fixes
* **media:** Handle case when one segment overlays another ([CS-439](https://jira.rfcx.org/browse/CS-439))

### Other
* **media:** Add unit tests for `convertAudio` function of `segment-file-utils` service ([CS-439](https://jira.rfcx.org/browse/CS-439))

### Performance Improvements
* **core:** Do not request min and max segment time for stream on segment creation - get it from segment ([CE-106](https://jira.rfcx.org/browse/CE-106))


## 1.0.7 (2021-02-22)

### Features
* **core:** Enable clustered annotation query by `is_manual` and `is_positive` ([CE-127](https://jira.rfcx.org/browse/CE-127))

### Bug Fixes
* **core:** Remove unuse parameters from `event` model
* **core:** CREATE requests for streams and projects return location header ([CS-237](https://jira.rfcx.org/browse/CS-237))


<a name="1.0.6"></a>
## 1.0.6 (2021-02-15)

### Features
* **core:** Detections endpoint from both internal and core will filter the detection that less than `ignore_threshold` out. And the default `ignore_threshold` is setting to 0.5 from classifier_output ([CS-473](https://jira.rfcx.org/browse/CS-473))
* **core:** Add `/event-strategies` endpoints to enable the cognition service to retrieve cognition logic ([CS-143](https://jira.rfcx.org/browse/CS-143))
* **core:** Add `descending` parameter to `/events` endpoint


<a name="1.0.5"></a>
## 1.0.5 (2021-02-12)

### Bug Fixes
* **core:** Enable clustered detections, fix `field` bug (previously defaulted to `id`)


<a name="1.0.4"></a>
## 1.0.4 (2021-02-09)

### Bug Fixes
* **core:** Fix wrong model spelling on classifiers endpoint ([CS-478](https://jira.rfcx.org/browse/CS-478))


<a name="1.0.3"></a>
## 1.0.3 (2021-02-08)

### Features
* **core:** add `organizations` and `projects` query into the `/stream` endpoint ([CS-403](https://jira.rfcx.org/browse/CS-403))


<a name="1.0.2"></a>
## 1.0.2 (2021-02-03)

### Features
* **core:** Detection review from Neo4j is saved in TimescaleDB also ([CS-331](https://jira.rfcx.org/browse/CS-331))

### Bug Fixes
* **core:** Remove bind({}) from AI creation endpoint
* **core:** Not implemented endpoints should return 501 instead of 504

### Other
* **core:** Disable clustered detections endpoint temprary - return 501
* **core:** Delete "reviews" parameter from detections query endpoint


<a name="1.0.1"></a>
## 1.0.1 (2021-02-02)

### Features
* **core:** use `annotations` instead of `detection_reviews` ([CS-392](https://jira.rfcx.org/browse/CS-392))
* **core:** update events endpoints to support `systemUser` ([CS-105](https://jira.rfcx.org/browse/CS-105))
* **core:** update classifier `last_executed_at` when saving detections ([CS-368](https://jira.rfcx.org/browse/CS-368))

### Performance Improvements
* **core:** drop `id` column on `detections` table ([CS-392](https://jira.rfcx.org/browse/CS-392))
* **core:** drop `first_detection_id` and `last_detection_id` columns on `events` table ([CS-392](https://jira.rfcx.org/browse/CS-392))


<a name="1.0.0"></a>
## 1.0.0 (2021-01-30)

### Bug Fixes
* **core:** setup release process ([CS-431](https://jira.rfcx.org/browse/CS-431))
* **media:** setup release process ([CS-431](https://jira.rfcx.org/browse/CS-431))
* **mqtt:** setup release process ([CS-431](https://jira.rfcx.org/browse/CS-431))

### Features
* **core:** setup release process ([CS-431](https://jira.rfcx.org/browse/CS-431))
* **media:** setup release process ([CS-431](https://jira.rfcx.org/browse/CS-431))
* **mqtt:** setup release process ([CS-431](https://jira.rfcx.org/browse/CS-431))

### Performance Improvements
* **core:** setup release process ([CS-431](https://jira.rfcx.org/browse/CS-431))
* **media:** setup release process ([CS-431](https://jira.rfcx.org/browse/CS-431))
* **mqtt:** setup release process ([CS-431](https://jira.rfcx.org/browse/CS-431))

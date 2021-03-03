## 1.0.14 (2012-03-03)

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
* **core:** refactor setup script

### Performance Improvements
* **core:** Do not request min and max segment time for stream on segment creation - get it from segment ([CE-106](https://jira.rfcx.org/browse/CE-106))


## 1.0.7 (2021-02-22)

### Features
* **core:** Enable clustered annotation query by `is_manual` and `is_positive` [CE-127](https://jira.rfcx.org/browse/CE-127)

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

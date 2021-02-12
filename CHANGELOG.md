<a name="1.0.4"></a>
## 1.0.4 (2021-02-09)

### Bug Fixs
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
INSERT INTO public.classifier_deployments (id, classifier_id, active, status, start, "end", created_by_id, deployment_parameters) VALUES (1, 1, true, 90, '2020-05-01 18:16:14', '2020-08-30 09:23:47', 8, NULL);
INSERT INTO public.classifier_deployments (id, classifier_id, active, status, start, "end", created_by_id, deployment_parameters) VALUES (2, 3, false, 20, '2018-01-14 08:36:54', '2020-07-15 12:42:51', 1, 'step_seconds=0.48');
INSERT INTO public.classifier_deployments (id, classifier_id, active, status, start, "end", created_by_id, deployment_parameters) VALUES (3, 3, true, 90, '2020-07-15 12:42:51', NULL, 1, NULL);
INSERT INTO public.classifier_deployments (id, classifier_id, active, status, start, "end", created_by_id, deployment_parameters) VALUES (4, 76, false, 10, '2020-02-20 16:16:16', '2020-03-21 18:16:14', 8, 'step_seconds=0.48');
INSERT INTO public.classifier_deployments (id, classifier_id, active, status, start, "end", created_by_id, deployment_parameters) VALUES (5, 76, true, 90, '2020-03-21 18:16:14', NULL, 8, NULL);
INSERT INTO public.classifier_deployments (id, classifier_id, active, status, start, "end", created_by_id, deployment_parameters) VALUES (6, 77, false, 10, '2020-03-02 11:03:03', '2020-03-21 18:16:14', 8, 'step_seconds=0.48');
INSERT INTO public.classifier_deployments (id, classifier_id, active, status, start, "end", created_by_id, deployment_parameters) VALUES (7, 77, false, 20, '2020-03-21 18:16:14', '2020-08-04 17:02:09', 8, 'step_seconds=0.48');
INSERT INTO public.classifier_deployments (id, classifier_id, active, status, start, "end", created_by_id, deployment_parameters) VALUES (8, 77, true, 90, '2020-08-04 17:02:09', NULL, 8, NULL);
INSERT INTO public.classifier_deployments (id, classifier_id, active, status, start, "end", created_by_id, deployment_parameters) VALUES (9, 78, false, 10, '2020-07-03 18:16:14', '2020-08-04 17:02:09', 8, 'step_seconds=0.48');
INSERT INTO public.classifier_deployments (id, classifier_id, active, status, start, "end", created_by_id, deployment_parameters) VALUES (10, 78, true, 20, '2020-08-04 17:02:09', NULL, 8, 'step_seconds=0.48');

ALTER SEQUENCE classifier_deployments_id_seq RESTART WITH 11;
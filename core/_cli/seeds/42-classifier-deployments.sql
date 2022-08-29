INSERT INTO public.classifier_deployments (id, classifier_id, status, start, "end", created_by_id) VALUES (1, 1, 90, '2020-05-01 18:16:14', '2020-08-30 09:23:47', 8);
INSERT INTO public.classifier_deployments (id, classifier_id, status, start, "end", created_by_id) VALUES (2, 3, 20, '2018-01-14 08:36:54', '2020-07-15 12:42:51', 1);
INSERT INTO public.classifier_deployments (id, classifier_id, status, start, "end", created_by_id) VALUES (3, 3, 90, '2020-07-15 12:42:51', NULL, 1);
INSERT INTO public.classifier_deployments (id, classifier_id, status, start, "end", created_by_id) VALUES (4, 76, 10, '2020-02-20 16:16:16', '2020-03-21 18:16:14', 8);
INSERT INTO public.classifier_deployments (id, classifier_id, status, start, "end", created_by_id) VALUES (5, 76, 90, '2020-03-21 18:16:14', NULL, 8);
INSERT INTO public.classifier_deployments (id, classifier_id, status, start, "end", created_by_id) VALUES (6, 77, 10, '2020-03-02 11:03:03', '2020-03-21 18:16:14', 8);
INSERT INTO public.classifier_deployments (id, classifier_id, status, start, "end", created_by_id) VALUES (7, 77, 20, '2020-03-21 18:16:14', '2020-08-04 17:02:09', 8);
INSERT INTO public.classifier_deployments (id, classifier_id, status, start, "end", created_by_id) VALUES (8, 77, 90, '2020-08-04 17:02:09', NULL, 8);
INSERT INTO public.classifier_deployments (id, classifier_id, status, start, "end", created_by_id) VALUES (9, 78, 10, '2020-07-03 18:16:14', '2020-08-04 17:02:09', 8);
INSERT INTO public.classifier_deployments (id, classifier_id, status, start, "end", created_by_id) VALUES (10, 78, 20, '2020-08-04 17:02:09', NULL, 8);

ALTER SEQUENCE classifier_deployments_id_seq RESTART WITH 11;
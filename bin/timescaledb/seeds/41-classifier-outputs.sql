INSERT INTO public.classifier_outputs (id, classifier_id, classification_id, output_class_name, ignore) VALUES (1, 36, 8076, 'environment', 1);
INSERT INTO public.classifier_outputs (id, classifier_id, classification_id, output_class_name, ignore) VALUES (2, 36, 7718, 'chainsaw', 0);
INSERT INTO public.classifier_outputs (id, classifier_id, classification_id, output_class_name, ignore) VALUES (3, 75, 8076, 'environment', 1);
INSERT INTO public.classifier_outputs (id, classifier_id, classification_id, output_class_name, ignore) VALUES (4, 75, 7723, 'voice', 0);
INSERT INTO public.classifier_outputs (id, classifier_id, classification_id, output_class_name, ignore) VALUES (5, 74, 8076, 'environment', 1);
INSERT INTO public.classifier_outputs (id, classifier_id, classification_id, output_class_name, ignore) VALUES (6, 74, 7830, 'dogbark', 0);
INSERT INTO public.classifier_outputs (id, classifier_id, classification_id, output_class_name, ignore) VALUES (7, 79, 8076, 'environment', 1);
INSERT INTO public.classifier_outputs (id, classifier_id, classification_id, output_class_name, ignore) VALUES (8, 79, 7719, 'vehicle', 0);
INSERT INTO public.classifier_outputs (id, classifier_id, classification_id, output_class_name, ignore) VALUES (9, 78, 8076, 'environment', 1);
INSERT INTO public.classifier_outputs (id, classifier_id, classification_id, output_class_name, ignore) VALUES (10, 78, 7952, 'gunshot', 0);

ALTER SEQUENCE classifier_outputs_id_seq RESTART WITH 11;
INSERT INTO public.classifier_outputs (id, classifier_id, classification_id, output_class_name, ignore) VALUES (1, 36, 8076, 'environment', true);
INSERT INTO public.classifier_outputs (id, classifier_id, classification_id, output_class_name, ignore) VALUES (2, 36, 7718, 'chainsaw', false);
INSERT INTO public.classifier_outputs (id, classifier_id, classification_id, output_class_name, ignore) VALUES (3, 75, 8076, 'environment', true);
INSERT INTO public.classifier_outputs (id, classifier_id, classification_id, output_class_name, ignore) VALUES (4, 75, 7723, 'voice', false);
INSERT INTO public.classifier_outputs (id, classifier_id, classification_id, output_class_name, ignore) VALUES (5, 74, 8076, 'environment', true);
INSERT INTO public.classifier_outputs (id, classifier_id, classification_id, output_class_name, ignore) VALUES (6, 74, 7830, 'dogbark', false);
INSERT INTO public.classifier_outputs (id, classifier_id, classification_id, output_class_name, ignore) VALUES (7, 79, 8076, 'environment', true);
INSERT INTO public.classifier_outputs (id, classifier_id, classification_id, output_class_name, ignore) VALUES (8, 79, 7719, 'vehicle', false);
INSERT INTO public.classifier_outputs (id, classifier_id, classification_id, output_class_name, ignore) VALUES (9, 78, 8076, 'environment', true);
INSERT INTO public.classifier_outputs (id, classifier_id, classification_id, output_class_name, ignore) VALUES (10, 78, 7952, 'gunshot', false);

ALTER SEQUENCE classifier_outputs_id_seq RESTART WITH 11;
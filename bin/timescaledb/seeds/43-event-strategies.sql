INSERT INTO public.event_strategies (id, name, function_name, function_parameters) VALUES (1, '4 detections in 90 seconds', 'window_count', 'window_seconds=90;minimum_count=4');
INSERT INTO public.event_strategies (id, name, function_name, function_parameters) VALUES (2, '1 detection in 90 seconds', 'window_count', 'window_seconds=90;minimum_count=1');
INSERT INTO public.event_strategies (id, name, function_name, function_parameters) VALUES (3, 'More than 20% detected in 5 minutes', 'window_percentage', 'window_seconds=300;minimum_percentage=20');

ALTER SEQUENCE event_strategies_id_seq RESTART WITH 4;
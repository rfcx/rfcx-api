/*
import datetime
import random
import uuid
import re

with open("./50-detections.sql", "r") as f:
    lines = f.readlines()

    for line in lines:
        regex = r"w*(VALUES\s)\('(?P<stream_id>.\w+)',\s(?P<classification_id>\d+),\s(?P<classifier_id>\d),\s'(?P<start>(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2}))',\s'(?P<end>(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2}))'"
        result = re.search(regex, line)
        id = uuid.uuid4()
        start = result.group('start')
        end = result.group('end')
        frequency_min = random.randint(0, 100) * 100
        frequency_max = frequency_min + (random.randint(1, 100) * 10)
        classification_id = result.group('classification_id')
        stream_id = result.group('stream_id')
        created_by_id = random.choice([1, 8])
        created_at = (datetime.datetime.strptime(end, '%Y-%m-%d %H:%M:%S') + datetime.timedelta(minutes=2)).strftime('%Y-%m-%d %H:%M:%S')
        updated_by_id = created_by_id
        updated_at = created_at
        print(f"""INSERT INTO public.annotations (id, start, "end", frequency_min, frequency_max, classification_id, stream_id, created_by_id, created_at, updated_by_id, updated_at) VALUES ('{id}', '{start}', '{end}', {frequency_min}, {frequency_max}, {classification_id}, '{stream_id}', {created_by_id}, '{created_at}', {updated_by_id}, '{updated_at}');""")
*/
INSERT INTO public."annotations" (id, stream_id, classification_id, start, "end", frequency_min, frequency_max, created_by_id, updated_by_id, created_at, updated_at) VALUES ('89098e06-d59f-455f-a90c-c0b373208d32', 'lgndfyp1enmu', 303, '2020-05-24 15:34:05.500', '2020-05-24 15:34:09.000', 2000, 7800, 8, 8, '2020-05-29 11:30:00.000', '2020-05-29 11:30:00.000');
INSERT INTO public."annotations" (id, stream_id, classification_id, start, "end", frequency_min, frequency_max, created_by_id, updated_by_id, created_at, updated_at) VALUES ('5bf7dd68-ef61-452d-bc42-e28ae1de230d', 'lgndfyp1enmu', 303, '2020-05-24 15:38:45.000', '2020-05-24 15:39:09.000', 2600, 6800, 8, 8, '2020-05-29 11:30:00.000', '2020-05-29 11:30:00.000');
INSERT INTO public."annotations" (id, stream_id, classification_id, start, "end", frequency_min, frequency_max, created_by_id, updated_by_id, created_at, updated_at) VALUES ('e309c97c-01ed-4db3-a3f2-946904c62a02', 'lgndfyp1enmu', 303, '2020-05-24 15:39:22.500', '2020-05-24 15:39:25.500', 2900, 8900, 8, 8, '2020-05-29 11:30:00.000', '2020-05-29 11:30:00.000');
INSERT INTO public."annotations" (id, stream_id, classification_id, start, "end", frequency_min, frequency_max, created_by_id, updated_by_id, created_at, updated_at) VALUES ('eda9c5c7-de13-4d5b-96bd-03ecd9158490', 'lgndfyp1enmu', 303, '2020-05-24 15:35:03.000', '2020-05-24 15:35:29.000', 1800, 8100, 8, 8, '2020-05-29 11:30:00.000', '2020-05-29 11:30:00.000');
INSERT INTO public."annotations" (id, stream_id, classification_id, start, "end", frequency_min, frequency_max, created_by_id, updated_by_id, created_at, updated_at) VALUES ('331d3d7b-1788-4ee9-8e7c-77516a280be4', 'lgndfyp1enmu', 303, '2020-05-24 19:10:53.500', '2020-05-24 19:12:05.500', 2000, 9200, 8, 8, '2020-05-29 11:30:00.000', '2020-05-29 11:30:00.000');
INSERT INTO public."annotations" (id, stream_id, classification_id, start, "end", frequency_min, frequency_max, created_by_id, updated_by_id, created_at, updated_at) VALUES ('3e426fa1-7f51-42d2-8361-b69e145f5169', 'lgndfyp1enmu', 303, '2020-05-24 19:29:00.000', '2020-05-24 19:29:16.750', 1800, 7400, 8, 8, '2020-05-29 11:30:00.000', '2020-05-29 11:30:00.000');
INSERT INTO public."annotations" (id, stream_id, classification_id, start, "end", frequency_min, frequency_max, created_by_id, updated_by_id, created_at, updated_at) VALUES ('df51db27-bf11-4b1a-9493-d7ebb572c181', 'lgndfyp1enmu', 345, '2020-05-24 15:30:45.000', '2020-05-24 15:30:59.500', 7700, 12000, 8, 8, '2020-05-29 11:30:00.000', '2020-05-29 11:30:00.000');
INSERT INTO public."annotations" (id, stream_id, classification_id, start, "end", frequency_min, frequency_max, created_by_id, updated_by_id, created_at, updated_at) VALUES ('bbcb7e6c-d09c-4845-9245-2328662eaad9', 'lgndfyp1enmu', 345, '2020-05-24 15:35:33.500', '2020-05-24 15:35:51.500', 9000, 13500, 8, 8, '2020-05-29 11:30:00.000', '2020-05-29 11:30:00.000');
INSERT INTO public."annotations" (id, stream_id, classification_id, start, "end", frequency_min, frequency_max, created_by_id, updated_by_id, created_at, updated_at) VALUES ('768d27ef-ea77-4c1e-9841-78dd5525dba8', 'ev69cht895gc', 268, '2020-05-24 12:25:05.500', '2020-05-24 12:25:14.000', 1300, 5220, 8, 8, '2020-05-29 11:30:00.000', '2020-05-29 11:30:00.000');
INSERT INTO public."annotations" (id, stream_id, classification_id, start, "end", frequency_min, frequency_max, created_by_id, updated_by_id, created_at, updated_at) VALUES ('2301646d-0654-4467-affd-9b6709be5358', 'ev69cht895gc', 268, '2020-05-24 12:28:45.000', '2020-05-24 12:28:49.000', 600, 5800, 8, 8, '2020-05-29 11:30:00.000', '2020-05-29 11:30:00.000');
INSERT INTO public."annotations" (id, stream_id, classification_id, start, "end", frequency_min, frequency_max, created_by_id, updated_by_id, created_at, updated_at) VALUES ('2301646d-0654-4467-affd-9b6709be5123', 'ev69cht895gc', 268, '2020-05-25 12:00:21.750', '2020-05-25 12:01:25.500', 900, 5900, 8, 8, '2020-05-29 11:30:00.000', '2020-05-29 11:30:00.000');
INSERT INTO public."annotations" (id, stream_id, classification_id, start, "end", frequency_min, frequency_max, created_by_id, updated_by_id, created_at, updated_at) VALUES ('2301646d-0654-4467-affd-9b6709be5124', 'ev69cht895gc', 353, '2020-05-25 12:15:00.000', '2020-05-25 12:15:05.000', 300, 10000, 1, 1, '2020-05-29 11:30:00.000', '2020-05-29 11:30:00.000');
INSERT INTO public.annotations (id, start, "end", frequency_min, frequency_max, classification_id, stream_id, created_by_id, created_at, updated_by_id, updated_at) VALUES ('ed8e2907-4e02-47b6-9b70-0aa75b1b1c51', '2020-10-16 04:02:25', '2020-10-16 04:02:27', 9600, 10420, 303, 'LilSjZJkRK06', 8, '2020-10-16 04:04:25', 8, '2020-10-16 04:04:25');
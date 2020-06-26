WITH selected_stream as (SELECT id, start, "end" FROM streams WHERE id = 'LilSjZJkRK08') INSERT INTO index_values SELECT time, (SELECT id FROM selected_stream) stream_id, 1 index_id, 5000*random() FROM generate_series((SELECT start FROM selected_stream), (SELECT "end" FROM selected_stream), '1 minute'::interval) time;
WITH selected_stream as (SELECT id, start, "end" FROM streams WHERE id = 'LilSjZJkRK08') INSERT INTO index_values SELECT time, (SELECT id FROM selected_stream) stream_id, 2 index_id, 5*random() FROM generate_series((SELECT start FROM selected_stream), (SELECT "end" FROM selected_stream), '1 minute'::interval) time;
WITH selected_stream as (SELECT id, start, "end" FROM streams WHERE id = 'LilSjZJkRK08') INSERT INTO index_values SELECT time, (SELECT id FROM selected_stream) stream_id, 8 index_id, random() FROM generate_series((SELECT start FROM selected_stream), (SELECT "end" FROM selected_stream), '1 minute'::interval) time;
WITH selected_stream as (SELECT id, start, "end" FROM streams WHERE id = 'LilSjZJkRK03') INSERT INTO index_values SELECT time, (SELECT id FROM selected_stream) stream_id, 1 index_id, 5000*random() FROM generate_series((SELECT start FROM selected_stream), (SELECT "end" FROM selected_stream), '1 minute'::interval) time;
WITH selected_stream as (SELECT id, start, "end" FROM streams WHERE id = 'LilSjZJkRK03') INSERT INTO index_values SELECT time, (SELECT id FROM selected_stream) stream_id, 2 index_id, 5*random() FROM generate_series((SELECT start FROM selected_stream), (SELECT "end" FROM selected_stream), '1 minute'::interval) time;
WITH selected_stream as (SELECT id, start, "end" FROM streams WHERE id = 'LilSjZJkRK03') INSERT INTO index_values SELECT time, (SELECT id FROM selected_stream) stream_id, 8 index_id, random() FROM generate_series((SELECT start FROM selected_stream), (SELECT "end" FROM selected_stream), '1 minute'::interval) time;
WITH selected_stream as (SELECT id, start, "end" FROM streams WHERE id = 'LilSjZJkRK17') INSERT INTO index_values SELECT time, (SELECT id FROM selected_stream) stream_id, 1 index_id, 5000*random() FROM generate_series((SELECT start FROM selected_stream), (SELECT "end" FROM selected_stream), '1 minute'::interval) time;
WITH selected_stream as (SELECT id, start, "end" FROM streams WHERE id = 'LilSjZJkRK17') INSERT INTO index_values SELECT time, (SELECT id FROM selected_stream) stream_id, 2 index_id, 5*random() FROM generate_series((SELECT start FROM selected_stream), (SELECT "end" FROM selected_stream), '1 minute'::interval) time;
WITH selected_stream as (SELECT id, start, "end" FROM streams WHERE id = 'LilSjZJkRK17') INSERT INTO index_values SELECT time, (SELECT id FROM selected_stream) stream_id, 8 index_id, random() FROM generate_series((SELECT start FROM selected_stream), (SELECT "end" FROM selected_stream), '1 minute'::interval) time;
WITH selected_stream as (SELECT id, start, "end" FROM streams WHERE id = 'LilSjZJkRK15') INSERT INTO index_values SELECT time, (SELECT id FROM selected_stream) stream_id, 1 index_id, 5000*random() FROM generate_series((SELECT start FROM selected_stream), (SELECT "end" FROM selected_stream), '1 minute'::interval) time;
WITH selected_stream as (SELECT id, start, "end" FROM streams WHERE id = 'LilSjZJkRK15') INSERT INTO index_values SELECT time, (SELECT id FROM selected_stream) stream_id, 2 index_id, 5*random() FROM generate_series((SELECT start FROM selected_stream), (SELECT "end" FROM selected_stream), '1 minute'::interval) time;
WITH selected_stream as (SELECT id, start, "end" FROM streams WHERE id = 'LilSjZJkRK15') INSERT INTO index_values SELECT time, (SELECT id FROM selected_stream) stream_id, 8 index_id, random() FROM generate_series((SELECT start FROM selected_stream), (SELECT "end" FROM selected_stream), '1 minute'::interval) time;

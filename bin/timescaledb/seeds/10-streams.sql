INSERT INTO public.streams(id, name, start, "end", is_public, created_by_id, created_at, updated_at) VALUES ('ev69cht895gc', 'Jaguar Station', '2020-01-01T00:00:00.000Z', '2020-12-31T23:59:59.999Z', false, 1, NOW(), NOW()) ON CONFLICT DO NOTHING;
INSERT INTO public.streams(id, name, start, "end", is_public, created_by_id, created_at, updated_at) VALUES ('lgndfyp1enmu', 'Vulture''s Rest', '2020-01-01T00:00:00.000Z', '2020-12-31T23:59:59.999Z', false, 1, NOW(), NOW()) ON CONFLICT DO NOTHING;

INSERT INTO public.streams(id, name, start, "end", is_public, created_by_id, created_at, updated_at) VALUES ('LilSjZJkRK01', 'Stas test private', '2020-01-01T10:00:00.000Z', '2020-01-01T11:00:00.000Z', false, 13, NOW(), NOW()) ON CONFLICT DO NOTHING;
INSERT INTO public.streams(id, name, start, "end", is_public, created_by_id, created_at, updated_at) VALUES ('LilSjZJkRK02', 'Stas test public', '2020-01-01T11:00:00.000Z', '2020-01-01T12:00:00.000Z', true, 13, NOW(), NOW()) ON CONFLICT DO NOTHING;

INSERT INTO public.streams(id, name, start, "end", is_public, created_by_id, created_at, updated_at) VALUES ('LilSjZJkRK03', 'Zhenya test private', '2020-01-01T12:00:00.000Z', '2020-01-01T13:00:00.000Z', false, 176, NOW(), NOW()) ON CONFLICT DO NOTHING;
INSERT INTO public.streams(id, name, start, "end", is_public, created_by_id, created_at, updated_at) VALUES ('LilSjZJkRK04', 'Zhenya test public', '2020-01-01T13:00:00.000Z', '2020-01-01T14:00:00.000Z', true, 176, NOW(), NOW()) ON CONFLICT DO NOTHING;

INSERT INTO public.streams(id, name, start, "end", is_public, created_by_id, created_at, updated_at) VALUES ('LilSjZJkRK05', 'Topher test private', '2020-01-01T14:00:00.000Z', '2020-01-01T15:00:00.000Z', false, 1, NOW(), NOW()) ON CONFLICT DO NOTHING;
INSERT INTO public.streams(id, name, start, "end", is_public, created_by_id, created_at, updated_at) VALUES ('LilSjZJkRK06', 'Topher test public', '2020-01-01T15:00:00.000Z', '2020-01-01T16:00:00.000Z', true, 1, NOW(), NOW()) ON CONFLICT DO NOTHING;

INSERT INTO public.streams(id, name, start, "end", is_public, created_by_id, created_at, updated_at) VALUES ('LilSjZJkRK07', 'Franco test private', '2020-01-01T16:00:00.000Z', '2020-01-01T17:00:00.000Z', false, 4342, NOW(), NOW()) ON CONFLICT DO NOTHING;
INSERT INTO public.streams(id, name, start, "end", is_public, created_by_id, created_at, updated_at) VALUES ('LilSjZJkRK08', 'Franco test public', '2020-01-01T17:00:00.000Z', '2020-01-01T18:00:00.000Z', true, 4342, NOW(), NOW()) ON CONFLICT DO NOTHING;

INSERT INTO public.streams(id, name, start, "end", is_public, created_by_id, created_at, updated_at) VALUES ('LilSjZJkRK09', 'Lawrence test private', '2020-01-01T18:00:00.000Z', '2020-01-01T19:00:00.000Z', false, 3686, NOW(), NOW()) ON CONFLICT DO NOTHING;
INSERT INTO public.streams(id, name, start, "end", is_public, created_by_id, created_at, updated_at) VALUES ('LilSjZJkRK10', 'Lawrence test public', '2020-01-01T19:00:00.000Z', '2020-01-01T20:00:00.000Z', true, 3686, NOW(), NOW()) ON CONFLICT DO NOTHING;

INSERT INTO public.streams(id, name, start, "end", is_public, created_by_id, created_at, updated_at) VALUES ('LilSjZJkRK11', 'Maria test private', '2020-01-01T18:00:00.000Z', '2020-01-01T19:00:00.000Z', false, 4853, NOW(), NOW()) ON CONFLICT DO NOTHING;
INSERT INTO public.streams(id, name, start, "end", is_public, created_by_id, created_at, updated_at) VALUES ('LilSjZJkRK12', 'Maria test public', '2020-01-01T19:00:00.000Z', '2020-01-01T20:00:00.000Z', true, 4853, NOW(), NOW()) ON CONFLICT DO NOTHING;

INSERT INTO public.streams(id, name, start, "end", is_public, created_by_id, created_at, updated_at) VALUES ('LilSjZJkRK13', 'Zephyr test private', '2020-01-01T20:00:00.000Z', '2020-01-01T21:00:00.000Z', false, 2229, NOW(), NOW()) ON CONFLICT DO NOTHING;
INSERT INTO public.streams(id, name, start, "end", is_public, created_by_id, created_at, updated_at) VALUES ('LilSjZJkRK14', 'Zephyr test public', '2020-01-01T21:00:00.000Z', '2020-01-01T22:00:00.000Z', true, 2229, NOW(), NOW()) ON CONFLICT DO NOTHING;
INSERT INTO public.streams(id, name, start, "end", is_public, created_by_id, project_id, created_at, updated_at) VALUES ('LilSjZJkR414', 'Zephyr test for project', '2020-01-01T21:00:00.000Z', '2020-01-01T22:00:00.000Z', true, 2229, 'bbbbbbbbbb10', NOW(), NOW()) ON CONFLICT DO NOTHING;

INSERT INTO public.streams(id, name, start, "end", is_public, created_by_id, created_at, updated_at) VALUES ('LilSjZJkRK15', 'Antony test private', '2020-01-01T22:00:00.000Z', '2020-01-01T23:00:00.000Z', false, 8, NOW(), NOW()) ON CONFLICT DO NOTHING;
INSERT INTO public.streams(id, name, start, "end", is_public, created_by_id, created_at, updated_at) VALUES ('LilSjZJkRK16', 'Antony test public', '2020-01-01T23:00:00.000Z', '2020-01-02T00:00:00.000Z', true, 8, NOW(), NOW()) ON CONFLICT DO NOTHING;
INSERT INTO public.streams(id, name, start, "end", is_public, created_by_id, project_id, created_at, updated_at) VALUES ('LilSjZJkRK19', 'Antony test for project', '2020-01-01T22:00:00.000Z', '2020-01-01T23:00:00.000Z', false, 8, 'bbbbbbbbbbb6', NOW(), NOW()) ON CONFLICT DO NOTHING;

INSERT INTO public.streams(id, name, start, "end", is_public, created_by_id, created_at, updated_at) VALUES ('LilSjZJkRK17', 'Andrey test private', '2020-01-02T00:00:00.000Z', '2020-01-02T01:00:00.000Z', false, 3150, NOW(), NOW()) ON CONFLICT DO NOTHING;
INSERT INTO public.streams(id, name, start, "end", is_public, created_by_id, created_at, updated_at) VALUES ('LilSjZJkRK18', 'Andrey test public', '2020-01-02T01:00:00.000Z', '2020-01-02T02:00:00.000Z', true, 3150, NOW(), NOW()) ON CONFLICT DO NOTHING;

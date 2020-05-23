INSERT INTO rfcx_api.GuardianSites (id, guid, name, description, is_active, created_at, updated_at, cartodb_map_id, flickr_photoset_id, timezone_offset, timezone, bounds, map_image_url, globe_icon_url, classy_campaign_id, protected_area, backstory, user_id, is_private, is_analyzable, organization) VALUES (1, 'none', 'No Site', 'No Site', 1, '2015-08-26 00:21:51.000', '2015-08-26 00:21:52.000', null, null, 0, 'UTC', null, null, null, null, null, null, null, 0, 0, null);
INSERT INTO rfcx_api.GuardianSites (id, guid, name, description, is_active, created_at, updated_at, cartodb_map_id, flickr_photoset_id, timezone_offset, timezone, bounds, map_image_url, globe_icon_url, classy_campaign_id, protected_area, backstory, user_id, is_private, is_analyzable, organization) VALUES (2, 'derc', 'RFCx Lab', 'Haight Ashbury, San Francisco, California', 1, '2015-08-26 00:27:19.000', '2019-10-18 16:11:08.000', '82b89e88-f90d-11e5-bdca-0ecd1babdde5', null, -8, 'America/Los_Angeles', null, null, null, null, null, null, null, 0, 0, null);
INSERT INTO rfcx_api.GuardianSites (id, guid, name, description, is_active, created_at, updated_at, cartodb_map_id, flickr_photoset_id, timezone_offset, timezone, bounds, map_image_url, globe_icon_url, classy_campaign_id, protected_area, backstory, user_id, is_private, is_analyzable, organization) VALUES (3, 'cerroblancotest', 'Cerro Blanco (test)', 'Guayaquil, Ecuador', 0, '2015-08-28 17:49:02.000', '2019-04-30 12:29:16.000', '5c2bde00-511b-11e5-b7fb-0e853d047bba', '72157679930193760', -5, 'America/Guayaquil', 0x000000000103000000010000000F00000025CB49287D0654C005FBAF73D30601C0F0A7C64B370554C03D0AD7A370FD00C0A01A2FDD240454C0CAC51858C7F100C011346612F50154C09FCBD424780301C0732D5A80B60054C086C77E164B1101C08ACBF10A44FF53C08716D9CEF71301C070EEAF1EF7FE53C0F321A81ABD1A01C02DB29DEFA7FE53C0F88A6EBDA62701C0E1B54B1B0EFE53C0276893C3273D01C06D91B41B7DFE53C0D960E124CD5F01C0813FFCFCF7FE53C06AA67B9DD45701C092921E86560054C036035C902D6B01C02FA2ED98BA0454C055F99E91084D01C0A1D634EF380654C0317903CC7C2701C025CB49287D0654C005FBAF73D30601C0, null, null, '218335', null, null, null, 0, 0, null);

INSERT INTO rfcx_api.Users (id, guid, type, username, email, is_email_validated, last_login_at, auth_password_salt, auth_password_hash, auth_password_updated_at, created_at, updated_at, firstname, lastname, default_site, rfcx_system, picture, subscription_email) VALUES (1, 'a4d3ed62-456d-4266-b018-17d9d45d5dbf', 'mobile', null, 'topher@rfcx.org', 0, '2020-05-23 09:30:12.461', '7rnp6271r0s5e014obs4e38e9dfuddz3avdw0fjlvly7kztr1guoiqwx4wbxqd', '13af7cbc4c5e2e816f155ab6b4b98a668ea64861872f8f9272ce38f47e9a45bb', '2015-08-26 05:46:58.000', '2015-08-26 05:46:58.000', '2020-05-23 09:30:12.000', 'Topher', 'White', 2, 1, null, null);
INSERT INTO rfcx_api.Users (id, guid, type, username, email, is_email_validated, last_login_at, auth_password_salt, auth_password_hash, auth_password_updated_at, created_at, updated_at, firstname, lastname, default_site, rfcx_system, picture, subscription_email) VALUES (8, '24582fec-bee2-42ba-a611-7cbffe1c1726', 'dev', null, 'antonyharfield@gmail.com', 0, '2020-05-22 13:15:15.523', 'dh3x2egahdle1no26q6esqexvs4u6t9nqtfronzihp0b5oathlodf2ujh4kkir', '2b34d3192608b64cf53b84d3de059f40d8ac30b727768c9c60189202948be033', '2015-10-09 04:19:23.000', '2015-10-09 04:19:23.000', '2020-05-21 09:40:55.000', 'Antony', 'Harfield', 3, 1, null, null);
INSERT INTO rfcx_api.Users (id, guid, type, username, email, is_email_validated, last_login_at, auth_password_salt, auth_password_hash, auth_password_updated_at, created_at, updated_at, firstname, lastname, default_site, rfcx_system, picture, subscription_email) VALUES (13, '63079ab5-fd39-4486-b01c-f61426ffce50', 'user', null, 'sr.rassokhin@gmail.com', 0, '2020-05-22 20:14:31.075', '01rtm8g2cz6geors0d62yd9471lu9oxognazer8qmqnurxgwkiqweo4j21lla1', '42d0cda31de076c6d0e444ef72e33571ac51bc8b23d6e4016df980637e3af2b8', '2017-04-10 09:46:56.010', '2015-11-05 19:15:46.000', '2020-05-22 20:14:31.000', 'Stanislav', 'Rassokhin', 2, 1, 'https://rfcx-users-staging.s3-eu-west-1.amazonaws.com/userpics/63079ab5-fd39-4486-b01c-f61426ffce50.jpg', null);

INSERT INTO rfcx_api.StreamVisibilities (id, value, created_at, updated_at) VALUES (1, 'private', '2019-10-29 14:16:02', '2019-10-29 14:16:02');
INSERT INTO rfcx_api.StreamVisibilities (id, value, created_at, updated_at) VALUES (2, 'site', '2020-01-17 17:00:57', '2020-01-17 17:00:58');
INSERT INTO rfcx_api.StreamVisibilities (id, value, created_at, updated_at) VALUES (3, 'public', '2020-01-17 17:01:05', '2020-01-17 17:01:06');
INSERT INTO rfcx_api.StreamVisibilities (id, value, created_at, updated_at) VALUES (4, 'deleted', '2020-01-17 17:01:13', '2020-01-17 17:01:14');

INSERT INTO rfcx_api.SampleRates (id, value, created_at, updated_at) VALUES (1, 12000, '2019-12-09 10:49:49', '2019-12-09 10:49:49');
INSERT INTO rfcx_api.SampleRates (id, value, created_at, updated_at) VALUES (2, 44100, '2019-12-11 11:08:14', '2019-12-11 11:08:14');
INSERT INTO rfcx_api.SampleRates (id, value, created_at, updated_at) VALUES (3, 96000, '2019-12-12 11:02:21', '2019-12-12 11:02:21');
INSERT INTO rfcx_api.SampleRates (id, value, created_at, updated_at) VALUES (4, 64000, '2019-12-12 13:24:38', '2019-12-12 13:24:38');
INSERT INTO rfcx_api.SampleRates (id, value, created_at, updated_at) VALUES (5, 50000, '2019-12-16 16:55:00', '2019-12-16 16:55:00');
INSERT INTO rfcx_api.SampleRates (id, value, created_at, updated_at) VALUES (6, 8000, '2019-12-17 12:47:26', '2019-12-17 12:47:26');
INSERT INTO rfcx_api.SampleRates (id, value, created_at, updated_at) VALUES (7, 48000, '2019-12-23 07:12:54', '2019-12-23 07:12:54');
INSERT INTO rfcx_api.SampleRates (id, value, created_at, updated_at) VALUES (8, 16000, '2019-12-26 05:34:05', '2019-12-26 05:34:05');

INSERT INTO rfcx_api.Locations (id, guid, name, latitude, longitude, description, created_at, updated_at) VALUES (1, '037cc9c7-bf77-411b-b01d-5973acece2e9', 'Taganrog Bay', 47.23617, 38.89688, 'Quiet place in the Taganrog Bay', '2020-05-22 21:04:39', '2020-05-22 21:04:41');
INSERT INTO rfcx_api.Locations (id, guid, name, latitude, longitude, description, created_at, updated_at) VALUES (2, '1ecf24b4-3a02-454e-8f33-0f8b850af456', 'SF Bay Area', 37.773972, -122.431297, 'San Francisco', '2020-05-22 21:06:00', '2020-05-22 21:06:03');

INSERT INTO rfcx_api.Streams (id, guid, name, description, starts, ends, created_at, updated_at, visibility, created_by, location, site, max_sample_rate, marked_as_deleted_at) VALUES (660, 'ev69cht895gc', 'Mouat Point', null, 1574167522000, 1574169382000, '2020-01-13 03:02:08', '2020-01-13 14:26:29', 1, 8, null, 2, 4, null);
INSERT INTO rfcx_api.Streams (id, guid, name, description, starts, ends, created_at, updated_at, visibility, created_by, location, site, max_sample_rate, marked_as_deleted_at) VALUES (678, 'lgndfyp1enmu', 'Tilly Point', null, 1574161242000, 1574168441000, '2020-01-28 14:40:08', '2020-01-28 14:49:24', 3, 8, null, 2, 4, null);
INSERT INTO rfcx_api.Streams (id, guid, name, description, starts, ends, created_at, updated_at, visibility, created_by, location, site, max_sample_rate, marked_as_deleted_at) VALUES (774, 'bgi2d2giu7z9', 'short-test-2', null, 1583941374000, 1583941974000, '2020-03-12 18:41:50', '2020-03-12 18:44:31', 1, 13, 2, 2, 2, null);
INSERT INTO rfcx_api.Streams (id, guid, name, description, starts, ends, created_at, updated_at, visibility, created_by, location, site, max_sample_rate, marked_as_deleted_at) VALUES (856, '7q9n6gb9xnuc', 'Numbers 1h', null, 1580551200000, 1580555241372, '2020-03-20 13:33:56', '2020-03-20 13:41:14', 3, 13, 1, 2, 2, null);
INSERT INTO rfcx_api.Streams (id, guid, name, description, starts, ends, created_at, updated_at, visibility, created_by, location, site, max_sample_rate, marked_as_deleted_at) VALUES (1083, 'euwjorhbmnsi', 'TestABC_1', null, 1531207800000, 1531211394999, '2020-05-06 18:35:00', '2020-05-06 20:46:21', 4, 13, null, 2, 2, '2020-05-06 20:46:21.874');


INSERT INTO rfcx_api.GuardianSites (id, guid, name, description, is_active, created_at, updated_at, cartodb_map_id, flickr_photoset_id, timezone_offset, timezone, bounds, map_image_url, globe_icon_url, classy_campaign_id, protected_area, backstory, user_id, is_private, is_analyzable, organization) VALUES (1, 'none', 'No Site', 'No Site', 1, '2015-08-26 00:21:51.000', '2015-08-26 00:21:52.000', null, null, 0, 'UTC', null, null, null, null, null, null, null, 0, 0, null);
INSERT INTO rfcx_api.GuardianSites (id, guid, name, description, is_active, created_at, updated_at, cartodb_map_id, flickr_photoset_id, timezone_offset, timezone, bounds, map_image_url, globe_icon_url, classy_campaign_id, protected_area, backstory, user_id, is_private, is_analyzable, organization) VALUES (2, 'derc', 'RFCx Lab', 'Haight Ashbury, San Francisco, California', 1, '2015-08-26 00:27:19.000', '2019-10-18 16:11:08.000', '82b89e88-f90d-11e5-bdca-0ecd1babdde5', null, -8, 'America/Los_Angeles', null, null, null, null, null, null, null, 0, 0, null);
INSERT INTO rfcx_api.GuardianSites (id, guid, name, description, is_active, created_at, updated_at, cartodb_map_id, flickr_photoset_id, timezone_offset, timezone, bounds, map_image_url, globe_icon_url, classy_campaign_id, protected_area, backstory, user_id, is_private, is_analyzable, organization) VALUES (3, 'cerroblancotest', 'Cerro Blanco (test)', 'Guayaquil, Ecuador', 0, '2015-08-28 17:49:02.000', '2019-04-30 12:29:16.000', '5c2bde00-511b-11e5-b7fb-0e853d047bba', '72157679930193760', -5, 'America/Guayaquil', 0x000000000103000000010000000F00000025CB49287D0654C005FBAF73D30601C0F0A7C64B370554C03D0AD7A370FD00C0A01A2FDD240454C0CAC51858C7F100C011346612F50154C09FCBD424780301C0732D5A80B60054C086C77E164B1101C08ACBF10A44FF53C08716D9CEF71301C070EEAF1EF7FE53C0F321A81ABD1A01C02DB29DEFA7FE53C0F88A6EBDA62701C0E1B54B1B0EFE53C0276893C3273D01C06D91B41B7DFE53C0D960E124CD5F01C0813FFCFCF7FE53C06AA67B9DD45701C092921E86560054C036035C902D6B01C02FA2ED98BA0454C055F99E91084D01C0A1D634EF380654C0317903CC7C2701C025CB49287D0654C005FBAF73D30601C0, null, null, '218335', null, null, null, 0, 0, null);

INSERT INTO rfcx_api.Users (id, guid, type, username, email, is_email_validated, last_login_at, auth_password_salt, auth_password_hash, auth_password_updated_at, created_at, updated_at, firstname, lastname, default_site, rfcx_system, picture, subscription_email) VALUES (1, 'a4d3ed62-456d-4266-b018-17d9d45d5dbf', 'mobile', null, 'topher@rfcx.org', 0, '2020-05-23 09:30:12.461', '7rnp6271r0s5e014obs4e38e9dfuddz3avdw0fjlvly7kztr1guoiqwx4wbxqd', '13af7cbc4c5e2e816f155ab6b4b98a668ea64861872f8f9272ce38f47e9a45bb', '2015-08-26 05:46:58.000', '2015-08-26 05:46:58.000', '2020-05-23 09:30:12.000', 'Topher', 'White', 2, 1, null, null);
INSERT INTO rfcx_api.Users (id, guid, type, username, email, is_email_validated, last_login_at, auth_password_salt, auth_password_hash, auth_password_updated_at, created_at, updated_at, firstname, lastname, default_site, rfcx_system, picture, subscription_email) VALUES (8, '24582fec-bee2-42ba-a611-7cbffe1c1726', 'dev', null, 'antonyharfield@gmail.com', 0, '2020-05-22 13:15:15.523', 'dh3x2egahdle1no26q6esqexvs4u6t9nqtfronzihp0b5oathlodf2ujh4kkir', '2b34d3192608b64cf53b84d3de059f40d8ac30b727768c9c60189202948be033', '2015-10-09 04:19:23.000', '2015-10-09 04:19:23.000', '2020-05-21 09:40:55.000', 'Antony', 'Harfield', 3, 1, null, null);
INSERT INTO rfcx_api.Users (id, guid, type, username, email, is_email_validated, last_login_at, auth_password_salt, auth_password_hash, auth_password_updated_at, created_at, updated_at, firstname, lastname, default_site, rfcx_system, picture, subscription_email) VALUES (13, '63079ab5-fd39-4486-b01c-f61426ffce50', 'user', null, 'sr.rassokhin@gmail.com', 0, '2020-05-22 20:14:31.075', '01rtm8g2cz6geors0d62yd9471lu9oxognazer8qmqnurxgwkiqweo4j21lla1', '42d0cda31de076c6d0e444ef72e33571ac51bc8b23d6e4016df980637e3af2b8', '2017-04-10 09:46:56.010', '2015-11-05 19:15:46.000', '2020-05-22 20:14:31.000', 'Stanislav', 'Rassokhin', 2, 1, 'https://rfcx-users-staging.s3-eu-west-1.amazonaws.com/userpics/63079ab5-fd39-4486-b01c-f61426ffce50.jpg', null);

INSERT INTO rfcx_api.UserSiteRelations (created_at, updated_at, user_id, guardian_site_id) VALUES ('2020-12-27 11:00:41', '2020-12-27 11:00:43', 1, 2)
INSERT INTO rfcx_api.UserSiteRelations (created_at, updated_at, user_id, guardian_site_id) VALUES ('2020-12-27 11:00:41', '2020-12-27 11:00:43', 8, 2)
INSERT INTO rfcx_api.UserSiteRelations (created_at, updated_at, user_id, guardian_site_id) VALUES ('2020-12-27 11:00:45', '2020-12-27 11:00:46', 8, 3)
INSERT INTO rfcx_api.UserSiteRelations (created_at, updated_at, user_id, guardian_site_id) VALUES ('2020-12-27 11:00:47', '2020-12-27 11:00:48', 13, 2)
INSERT INTO rfcx_api.UserSiteRelations (created_at, updated_at, user_id, guardian_site_id) VALUES ('2020-12-27 11:00:50', '2020-12-27 11:00:51', 13, 3)

INSERT INTO rfcx_api.Guardians (id, guid, site_id, shortname, is_certified, phone_number, carrier_name, last_check_in, check_in_count, last_update_check_in, update_check_in_count, is_updatable, latitude, longitude, cartodb_coverage_id, auth_token_salt, auth_token_hash, auth_token_expires_at, auth_token_updated_at, created_at, updated_at, sim_card_id, notes, is_visible, creator, is_private) VALUES (129, 'c9d541166e12', 3, 'Sede - North Road #1', 0, null, null, '2017-05-27 02:43:28.643', 26189, null, 0, 1, -1.7983700037002563, -46.96590042114258, null, 'jw8yefdeq8lyxgwg3u6c58le4zir03i9y0617fkzc2xkpwilrzs1cq9upeq7du', '04d331fc675c433d8af62fb9996c7a8f3e58aed526e23805e3fbf447dd643bf5', '2016-09-15 00:08:30.000', '2016-05-20 00:08:32.000', '2015-09-02 00:08:15.000', '2017-05-27 02:43:28.000', null, null, 0, null, 0);

INSERT INTO rfcx_api.SourceTypes (id, name, created_at, updated_at) VALUES (1, 'GuardianAudio', '2017-04-17 12:21:49', '2017-04-17 12:21:51');
INSERT INTO rfcx_api.SourceTypes (id, name, created_at, updated_at) VALUES (2, 'Users', '2017-04-17 12:22:04', '2017-04-17 12:22:07');

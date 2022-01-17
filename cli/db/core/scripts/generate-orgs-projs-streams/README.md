## Introduction

This scripts generates random `organizations`, `projects` and `streams` sql files for users specified in `bin/timescaledb/seeds/02-users.sql` file. It also creates random roles for these users across generated items.

Change `orgsPerUser`, `projsPerUser` and `streamsPerUser` to get required number of rows in sql files.

Sql files are created in the same directory. Import them in your database.

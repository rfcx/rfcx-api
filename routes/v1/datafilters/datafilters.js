var verbose_logging = (process.env.NODE_ENV !== "production");
var models = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var ApiConverter = require("../../../utils/api-converter");
var requireUser = require("../../../middleware/authorization/authorization").requireTokenType("user");
var sequelize = require('../../../models/index');


function condAdd(sql, condition, add) {
	if(condition) {
		sql += add;
	}

	return sql;
}


function randomDataFilter(filter) {
	var sql = 'SELECT a.guid FROM GuardianAudio a LEFT JOIN GuardianAudioTags t on a.id=t.audio_id' +
			   ' INNER JOIN GuardianSites s ON a.site_id=s.id '+
				' where (t.tagged_by_user is null OR t.tagged_by_user != :user)';

	sql = condAdd(sql, filter.start, ' and a.measured_at >= :start');
	sql = condAdd(sql, filter.end, ' and a.measured_at < :end');
	sql = condAdd(sql, filter.todStart, ' and TIME(a.measured_at) >= :todStart');
	sql = condAdd(sql, filter.todEnd, ' and TIME(a.measured_at) < :todEnd');
	sql = condAdd(sql, filter.sites, ' and s.guid in (:sites)');
	sql = condAdd(sql, filter.guardians, ' and a.guardian_id in (:guardians)');

	if(filter.labelGoal == null) {
		filter.labelGoal = 3;
	}

	sql += ' group by a.guid having count(DISTINCT t.tagged_by_user) < :labelGoal order by count(DISTINCT t.tagged_by_user) DESC, RAND()';

	sql = condAdd(sql, filter.limit, ' LIMIT :limit');

	return sequelize.sequelize.query(sql,
		{ replacements: filter, type: sequelize.sequelize.QueryTypes.SELECT }
	)
}

function filterByTag(filter) {
	var sql = 'SELECT DISTINCT a.guid FROM GuardianAudio a LEFT JOIN GuardianAudioTags t on a.id=t.audio_id';
	sql += ' where t.type = :type';
	sql += ' and t.value in (:tags)';
	sql = condAdd(sql, filter.hasLabels, ' group by a.guid having count(DISTINCT t.tagged_by_user) > 2');
	sql = condAdd(sql, filter.limit, ' LIMIT :limit');

	return sequelize.sequelize.query(sql,
		{ replacements: filter, type: sequelize.sequelize.QueryTypes.SELECT }
	)
}

function processResults(promise, req, res) {
	return promise.then(function(guids) {
		return views.models.DataFilterAudioGuidToJson(req, res, guids).then(function (result) {
			res.status(200).json(result);
		});

	}).catch(function (err) {
		if(!!err){
			res.status(500).json({msg: err});
		}
	});
}

router.route("/tag")
	.post(passport.authenticate("token", {session: false}), requireUser, function (req, res) {
		var converter = new ApiConverter("datafilter", req);
		var tagFilter = converter.mapApiToPojo(req.body);

		var promise = filterByTag(tagFilter);
		processResults(promise, req, res);
	});

router.route("/labelling")
	.get(passport.authenticate("token", {session: false}), requireUser, function (req, res) {
		var randomFilter = {
			user: req.rfcx.auth_token_info.owner_id,
			limit: 1
		};

		if (req.query.site) {
			randomFilter.sites = [req.query.site];
		}
		if (req.query.guardian) {
			randomFilter.guardians = [req.query.site];
		}

		var promise = randomDataFilter(randomFilter);
		processResults(promise, req, res);
	});


module.exports = router;
var verbose_logging = (process.env.NODE_ENV !== "production");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var ApiConverter = require("../../../utils/api-converter");
var requireUser = require("../../../middleware/authorization/authorization").requireTokenType("user");
var models = require('../../../models');


function condAdd(sql, condition, add) {
	if(condition != null && condition != false) {
		sql += add;
	}

	return sql;
}


function filter(filterOpts) {
	var sql = 'SELECT DISTINCT a.guid FROM GuardianAudio a LEFT JOIN GuardianAudioTags t on a.id=t.audio_id' +
			   ' INNER JOIN GuardianSites s ON a.site_id=s.id ';

	sql = condAdd(sql, filterOpts.annotator, ' where (t.tagged_by_user is null OR t.tagged_by_user != :annotator)');
	sql = condAdd(sql, filterOpts.start, ' and a.measured_at >= :start');
	sql = condAdd(sql, filterOpts.end, ' and a.measured_at < :end');
	sql = condAdd(sql, filterOpts.todStart, ' and TIME(a.measured_at) >= :todStart');
	sql = condAdd(sql, filterOpts.todEnd, ' and TIME(a.measured_at) < :todEnd');
	sql = condAdd(sql, filterOpts.sites, ' and s.guid in (:sites)');
	sql = condAdd(sql, filterOpts.tagType, ' where t.type = :tagType');
	sql = condAdd(sql, filterOpts.tagValues, ' and t.value in (:tagValues)');
	sql = condAdd(sql, filterOpts.hasLabels, ' group by a.guid having count(DISTINCT t.tagged_by_user) > 2');
	sql = condAdd(sql, !filterOpts.hasLabels, ' group by a.guid having count(DISTINCT t.tagged_by_user) < 3 order by count(DISTINCT t.tagged_by_user) DESC, RAND()');
	sql = condAdd(sql, filterOpts.limit, ' LIMIT :limit');

	return models.sequelize.query(sql,
		{ replacements: filterOpts, type: models.sequelize.QueryTypes.SELECT }
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


router.route("/labelling")
	.get(passport.authenticate("token", {session: false}), requireUser, function (req, res) {
		var filterOpts = {
			annotator: req.rfcx.auth_token_info.owner_id,
			limit: 1,
			hasNoLabels: false
		};

		if (req.query.site) {
			filterOpts.sites = [req.query.site];
		}
		if (req.query.guardian) {
			filterOpts.guardians = [req.query.site];
		}

		var promise = filter(filterOpts);
		processResults(promise, req, res);
	});

router.route("/")
	.post(passport.authenticate("token", {session: false}), requireUser, function (req, res) {
		var converter = new ApiConverter("datafilter", req);
		var filterOpts = converter.mapApiToPojo(req.body);
		var promise = filter(filterOpts);
		processResults(promise, req, res);
	});
module.exports = router;
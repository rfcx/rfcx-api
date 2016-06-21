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
	if(condition != null) {
		sql += add;
	}

	return sql;
}

function condIteratorAdd(sql, iterator, add) {
	if(iterator == null) {
		return sql;
	}

	sql += add + ' (' + iterator.join() + ') ';

	return sql;
}



function randomDataFilter(api, req, res) {
	var converter = new ApiConverter("datafilter", req);
	var sql = 'SELECT a.guid FROM GuardianAudio a LEFT JOIN Classifications c ' +
		' on a.guid=c.audio_id where (c.analyst is null OR c.analyst != :analyst)';

	api.sites = JSON.parse(api.sites);
	api.guardians = JSON.parse(api.guardians);

	sql = condAdd(sql, api.start, ' and a.measured_at >= :start');
	sql = condAdd(sql, api.end, ' and a.measured_at < :end');
	sql = condAdd(sql, api.todStart, ' and TIME(a.measured_at) >= :todStart');
	sql = condAdd(sql, api.todEnd, ' and TIME(a.measured_at) < :todEnd');
	sql = condAdd(sql, api.sites, ' and a.site_id in (:sites)');
	sql = condAdd(sql, api.guardians, ' and a.guardian_id in (:guardians)');
	sql = condAdd(sql, api.classificationType, ' and c.classification_type in (:classificationType)');



	if(api.classificationGoal == null) {
		api.classificationGoal = 3;
	}

	sql += ' group by a.guid having count(DISTINCT c.analyst) < :classificationGoal order by count(DISTINCT c.analyst) DESC, RAND()';

	sql = condAdd(sql, api.limit, ' LIMIT :limit');

	sequelize.sequelize.query(sql,
		{ replacements: api, type: sequelize.sequelize.QueryTypes.SELECT }
	).then(function(guids) {
		var result = {};

		result.audios = guids.map(function (obj) {
			return obj.guid;
		});

		var resultApi = converter.mapPojoToApi(result);
		res.status(200).json(resultApi);
	}).catch(function (err) {
		if(!!err){
			res.status(500).json({msg: err});
		}
	});
}

router.route("/")
	.post(passport.authenticate("token", {session: false}), requireUser, function (req, res) {
		var converter = new ApiConverter("datafilter", req, "name");
		var db = converter.mapApiToSequelize(req.body);
		db.guardians = JSON.stringify(db.guardians);
		db.sites = JSON.stringify(db.sites);
		models.Datafilters.create(db).then(function (filter) {
			var apiFilter = converter.mapSequelizeToApi(filter);
			res.status(201).json(apiFilter);
		}).catch(function (err) {
			if(!!err){
				res.status(409).json({msg:"The datafilter could not be created. The name is already in use."});
			}
		});

	});


router.route("/:datafilter_name")
	.get(passport.authenticate("token", {session: false}), requireUser, function (req, res) {
		var converter = new ApiConverter("datafilter", req);
		models.Datafilters.findOne({where: {name: req.params.datafilter_name}}).then(function (dbFilter) {
			var api = converter.mapSequelizeToApi(dbFilter);
			randomDataFilter(api.data.attributes, req, res);
		}).catch(function (err) {
			if(!!err){
				res.status(404).json({msg:"The datafilter could not be found: "+ err});
			}
		});
	});

module.exports = router;
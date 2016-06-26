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
var urls = require("../../../utils/misc/urls");

function condAdd(sql, condition, add) {
	if(condition != null) {
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

function tagFilter(filter) {

	filter.limit =  filter.limit ? filter.limit : 1;
	var sql = 'SELECT DISTINCT a.guid FROM GuardianAudio a LEFT JOIN GuardianAudioTags t on a.id=t.audio_id';
	sql += ' where t.type == :type';
	sql += ' and t.tag in (:tags)';
	sql += ' LIMIT :limit';

	return sequelize.sequelize.query(sql,
		{ replacements: filter, type: sequelize.sequelize.QueryTypes.SELECT }
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



router.route("/labelling")
	.get(passport.authenticate("token", {session: false}), requireUser, function (req, res) {

		var converter = new ApiConverter("datafilter", req);
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

		randomDataFilter(randomFilter).then(function(guids) {
			var result = {
				data: {
					type: "datafilter",
					attributes: {}
				},
				links: {
					self: urls.getApiUrl(req) + '/v1/datafilters/labelling'
				}
			};

			result.data.attributes.audio = guids.map(function (obj) {
				return {
					guid: obj.guid,
					link: urls.getAudioUrl(req, obj.guid)
				}
			});


			res.status(200).json(result);
		}).catch(function (err) {
			if(!!err){
				res.status(500).json({msg: err});
			}
		});
	});


module.exports = router;
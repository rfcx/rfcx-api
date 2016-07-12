var verbose_logging = (process.env.NODE_ENV !== "production");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var ApiConverter = require("../../../utils/api-converter");
var requireUser = require("../../../middleware/authorization/authorization").requireTokenType("user");
var models = require('../../../models');
var flipCoin = require("../../../utils/misc/rand.js").flipCoin;

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
	sql = condAdd(sql, filterOpts.lowConfidence, ' and t.confidence <= 0.5');
	sql = condAdd(sql, filterOpts.highConfidence, ' and t.confidence > 0.5');
	sql = condAdd(sql, filterOpts.hasLabels, ' group by a.guid having count(DISTINCT t.tagged_by_user) > 2');
	sql = condAdd(sql, !filterOpts.hasLabels, ' group by a.guid having count(DISTINCT t.tagged_by_user) < 3 order by count(DISTINCT t.tagged_by_user) DESC, RAND()');
	sql = condAdd(sql, filterOpts.limit, ' LIMIT :limit');

	return models.sequelize.query(sql,
    { replacements: filterOpts, type: models.sequelize.QueryTypes.SELECT }
  );
}

function processResults(promise, req, res) {
	return promise.then(function(data) {
		return processSuccess(data, req, res);
	}).catch(function (err) {
		processError(err, req, res);
	});
}

function processSuccess(data, req, res) {
  return views.models.DataFilterAudioGuidToJson(req, res, data).then(function (result) {
    res.status(200).json(result);
  });
}

function processError(err, req, res) {
  if(!!err){
    res.status(500).json({msg: err});
  }
}

router.route("/labelling/:type?")
	.get(passport.authenticate("token", {session: false}), requireUser, function (req, res) {
		var filterOpts = {
			annotator: req.rfcx.auth_token_info.owner_id,
			limit: parseInt(req.query.limit) || 1,
			hasLabels: false
		};

		if (req.query.site) {
			filterOpts.sites = [req.query.site];
		}
		if (req.query.guardian) {
			filterOpts.guardians = [req.query.guardian];
		}

    // if tag was specified, then flip coin
    if (req.params.type) {
      // if true then search for audios tagged with specified tag
      if (flipCoin()) {
        filterOpts.tagValues = req.params.type;
        filterOpts.highConfidence = true;
      }
    }

		filter(filterOpts)
      .then(function(guids) {
        // if we found result then act like always...
        if (guids.length) {
          return guids;
        }
        // if we not found any guids then go another way
        else {
          // search random guids without tagging by model property
          delete filterOpts.tagValues;
          delete filterOpts.highConfidence;
          // then return result whatever it will be - founded guids or empty array
          return filter(filterOpts);
        }
      })
      .then(function(data) {
        return processSuccess(data, req, res);
      })
      .catch(function (err) {
        processError(err, req, res);
      });
	});

router.route("/")
	.post(passport.authenticate("token", {session: false}), requireUser, function (req, res) {
		var converter = new ApiConverter("datafilter", req);
		var filterOpts = converter.mapApiToPojo(req.body);
		var promise = filter(filterOpts);
		processResults(promise, req, res);
	});
module.exports = router;
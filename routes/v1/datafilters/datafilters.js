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
    // the WHERE 1=1 allows us to add new conditions always with AND otherwise we have to make sure that a previous
    // condition was met that inserted the WHERE clause
  var sql = 'SELECT DISTINCT a.guid FROM GuardianAudio a LEFT JOIN GuardianAudioTags t on a.id=t.audio_id' +
         ' INNER JOIN GuardianSites s ON a.site_id=s.id where 1=1';


    // filter out files annotated by user
    if (filterOpts.annotator) {
        sql += ' and a.id not in (SELECT DISTINCT sq.audio_id FROM GuardianAudioTags sq where sq.type="warning" OR (sq.tagged_by_user=:annotator and sq.type="label"))'
    } else {
        // filter out corrupted files - TODO: we need to improve the index scan otherwise this is inefficient
        sql += ' and a.id not in (SELECT DISTINCT sq.audio_id FROM GuardianAudioTags sq where sq.type="warning")'
    }


  sql = condAdd(sql, filterOpts.start, ' and a.measured_at >= :start');
  sql = condAdd(sql, filterOpts.end, ' and a.measured_at < :end');
  sql = condAdd(sql, filterOpts.todStart, ' and TIME(a.measured_at) >= :todStart');
  sql = condAdd(sql, filterOpts.todEnd, ' and TIME(a.measured_at) < :todEnd');
  sql = condAdd(sql, filterOpts.sites, ' and s.guid in (:sites)');
  sql = condAdd(sql, filterOpts.tagType, ' and t.type = :tagType');
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

function getLabelsData(filterOpts) {
  var sql = 'SELECT a.guid, t.begins_at_offset, ROUND(AVG(t.confidence)) as confidence FROM GuardianAudioTags t LEFT JOIN GuardianAudio a on a.id=t.audio_id where ';

  sql = condAdd(sql, filterOpts.tagType, ' type = :tagType');
  sql = condAdd(sql, filterOpts.tagValues, ' and value in (:tagValues)');
  sql = condAdd(sql, filterOpts.start, ' and a.measured_at >= :start');
  sql = condAdd(sql, filterOpts.end, ' and a.measured_at < :end');
  sql = condAdd(sql, true, ' group by t.audio_id, begins_at_offset having count(DISTINCT t.tagged_by_user) > 2 order by t.begins_at_offset ASC');

  return models.sequelize.query(sql,
    { replacements: filterOpts, type: models.sequelize.QueryTypes.SELECT }
  );
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

router.route("/labelling/:tagValues?")
  .get(passport.authenticate("token", {session: false}), requireUser, function (req, res) {
    var filterOpts = {
      limit: parseInt(req.query.limit) || 1,
      hasLabels: req.query.hasLabels? Boolean(req.query.hasLabels) : false
    };

    if (!req.query.ignoreAnnotator) {
      filterOpts.annotator = req.rfcx.auth_token_info.owner_id;
    }
    if (req.query.site) {
      filterOpts.sites = [req.query.site];
    }
    if (req.query.guardian) {
      filterOpts.guardians = [req.query.guardian];
    }

    if (req.query.start) {
      filterOpts.start = new Date(req.query.start);
    }

    if (req.query.end) {
      filterOpts.end = new Date(req.query.end);
    }

    if (req.query.tagType) {
      filterOpts.tagType = req.query.tagType;
    }

    if (req.query.highConfidence) {
      filterOpts.highConfidence = Boolean(req.query.highConfidence);
    }

    if (req.query.lowConfidence) {
      filterOpts.lowConfidence = Boolean(req.query.lowConfidence);
    }

    // if tag was specified, then flip coin
    if (req.params.tagValues) {
      // if true then search for audios tagged with specified tag
      if (req.query.noRandomValues || flipCoin()) {
        filterOpts.tagValues = req.params.tagValues;
      }
    }

    filter(filterOpts).bind({})
      .then(function(guids) {
        // if we found result then act like always...
        if (guids.length || req.query.noRandomValues) {
          return guids;
        }
        // if we not found any guids then go another way
        else {
          // search random guids without tagging by model property
          delete filterOpts.tagType;
          delete filterOpts.tagValues;
          delete filterOpts.highConfidence;
          delete filterOpts.lowConfidence;
          filterOpts.hasLabels = false;
          // then return result whatever it will be - founded guids or empty array
          return filter(filterOpts);
        }
      })
      .then(function(data) {
        this.guids = data;
        if (req.query.withCSV && data.length) {
          return getLabelsData(filterOpts);
        }
        else {
          return null;
        }
      })
      .then(function(labels) {
        return processSuccess({
          guids: this.guids,
          labels: labels
        }, req, res);
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
var verbose_logging = (process.env.NODE_ENV !== "production");
var models = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var ApiConverter = require("../../../utils/api-converter");


function getUrl(req) {
    return req.protocol + '://' + req.get('host') + '/v1';
}

// create new report 
router.route("/")
    .post(passport.authenticate("token", {session: false}), function (req, res) {
        var converter = new ApiConverter("report", getUrl(req));

        var apiReport = converter.mapToDb(req.body);
        apiReport.reporter = req.rfcx.auth_token_info.owner_id;
        models.Report
            .create(apiReport).then(function (dbReport) {
            res.status(201).json(converter.mapToApi(dbReport));
        }).catch(function (err) {
            // creation failed... probable cause: uuid already existed, strange!
            if (!!err) {
                res.status(500).json({title: "The Report could not be generated. Maybe your id was not unique?"});
            }
        });

    });

// retrieve one report 
router.route("/:report_id")
    .get(passport.authenticate("token", {session: false}), function (req, res) {
        var converter = new ApiConverter("report", getUrl(req));

        models.Report
            .findOne({
                where: {id: req.params.report_id}
            }).then(function (dbReport) {
            if (dbReport.reporter != req.rfcx.auth_token_info.owner_id) {
                res.status(403).json({title: "You are only allowed to access your own reports. This report was created by someone else."});
            } else {
                res.status(200).json(converter.mapToApi(dbReport));
            }
        }).catch(function (err) {
            if (!!err) {
                res.status(404).json({title: "Report with id " + req.params.report_id + " does not exist."});
            }
        });

    });


module.exports = router;

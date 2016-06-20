var verbose_logging = (process.env.NODE_ENV !== "production");
var models = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var ApiConverter = require("../../../utils/api-converter");
var requireUser = require("../../../middleware/authorization/authorization").requireTokenType("user");


// create new report 
router.route("/")
    .post(passport.authenticate("token", {session: false}), requireUser, function (req, res) {
        var converter = new ApiConverter("report", req);
        var apiReport = converter.mapApiToSequelize(req.body);
        apiReport.reporter = req.rfcx.auth_token_info.owner_id;
        models.Report
            .create(apiReport).then(function (dbReport) {
            res.status(201).json(converter.mapSequelizeToApi(dbReport));
        }).catch(function (err) {
            // creation failed... probable cause: uuid already existed, strange!
            if (!!err) {
                res.status(500).json({title: "The Report could not be generated. Maybe your id was not unique?"});
            }
        });

    });

// retrieve one report 
router.route("/:report_id")
    .get(passport.authenticate("token", {session: false}), requireUser, function (req, res) {
        var converter = new ApiConverter("report", req);

        models.Report
            .findOne({
                where: {id: req.params.report_id}
            }).then(function (dbReport) {
            if (dbReport.reporter != req.rfcx.auth_token_info.owner_id) {
                res.status(403).json({title: "You are only allowed to access your own reports. This report was created by someone else."});
            } else {
                res.status(200).json(converter.mapSequelizeToApi(dbReport));
            }
        }).catch(function (err) {
            if (!!err) {
                res.status(404).json({title: "Report with id " + req.params.report_id + " does not exist."});
            }
        });

    });


module.exports = router;

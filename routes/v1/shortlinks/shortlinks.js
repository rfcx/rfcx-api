var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var httpError = require("../../../utils/http-errors.js");


router.route("/:shortlink_id")
  .get(function(req,res) {

    var linkId = req.params.shortlink_id, linkDelim = linkId.indexOf("+");
    var linkPre = (linkDelim > 0) ? linkId.substr(0,linkDelim) : null;
    linkId = (linkDelim > 0) ? linkId.substr(1+linkDelim) : linkId;

    if (linkPre === "ap") {
      res.redirect(301, "https://adopt-protect.rfcx.org/#/a/"+linkId.toLowerCase() );

    } else if (linkPre === "bt") {
      res.redirect(301, "https://bit.ly/"+linkId );

    } else {

      models.ShortLink
        .findOne({ 
          where: { guid: linkId },
          include: [ { all: true } ]
        }).then(function(dbShortLink){
          
          dbShortLink.access_count = 1 + dbShortLink.access_count;
          dbShortLink.save();
          
          console.log("redirecting client to: '"+dbShortLink.url+"'");
          res.redirect(301, dbShortLink.url );

        }).catch(function(err){
          // console.log("failed to return site | "+err);
          // if (!!err) { res.status(500).json({msg:"failed to return site"}); }
          res.status(200).json({ shortlink: req.params.shortlink_id });
        });

    }

  })
;

router.route("/")
  .get(function(req,res) {
    res.redirect(301, "https://rfcx.org/");
  })
;



module.exports = router;




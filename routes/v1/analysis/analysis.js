var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");

router.route("/methods")
  .get(function(req,res) {

    models.AudioAnalysisMethod
      .findAll({ 
   //     where: {  }, 
        include: [{ all: true }]
      }).then(function(dbAnalysisMethods){

        if (dbAnalysisMethods.length < 1) {
          httpError(res, 404, "database");
        } else {
          res.status(200).json(views.models.audioAnalysisMethods(req,res,dbAnalysisMethods));
        }
        
      }).catch(function(err){
        console.log("failed to return analysis methods | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return analysis methods"}); }
      });

  })
;



module.exports = router;




exports.setAssociations = function(models) {

  var _assoc = { 

    hasOne: [
//      { parent: "Guardian", child: "GuardianSoftware", as: "SoftwareVersion" }
      { parent: "GuardianCheckIn", child: "GuardianSoftware", as: "SoftwareVersion" }
    ],
    belongsTo: [
      // { child: "GuardianCheckIn", parent: "Guardian", as: "Guardian" },
      // { child: "GuardianAudio", parent: "GuardianCheckIn", as: "CheckIn" },
      // { child: "Guardian", parent: "GuardianSoftware", as: "SoftwareVersion" }
    ],
    hasMany: [
      // { parent: "Guardian", child: "GuardianMessage", as: "Message" }
    ]
  };

  for (var i in _assoc.hasOne) {
    models[_assoc.hasOne[i].parent].hasOne(models[_assoc.hasOne[i].child],{as:_assoc.hasOne[i].as});
    console.log(_assoc.hasOne[i]);
//    Model[Assoc.hasOne[i].parent].hasOne(Model[Assoc.hasOne[i].child],{as:Assoc.hasOne[i].as});
  }

  return models;
};

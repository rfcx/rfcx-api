exports.getAssoc = function() {

  var Assoc = { 
    hasOne: [
//      { parent: "Guardian", child: "GuardianSoftware", as: "SoftwareVersion" }
      { parent: "GuardianCheckIn", child: "GuardianSoftware", as: "SoftwareVersion" }
    ],
    belongsTo: [
      { child: "GuardianCheckIn", parent: "Guardian", as: "Guardian" },
      { child: "GuardianAudio", parent: "GuardianCheckIn", as: "CheckIn" },
      { child: "Guardian", parent: "GuardianSoftware", as: "SoftwareVersion" }
    ],
    hasMany: [
      { parent: "Guardian", child: "GuardianMessage", as: "Message" }
    ]
  };

  return Assoc;
};

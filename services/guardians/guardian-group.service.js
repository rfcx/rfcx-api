var models = require("../../models");
var sequelize = require("sequelize");
var Converter = require('../../utils/converter/converter');
var Promise = require("bluebird");
var ValidationError = require("../../utils/converter/validation-error");

function getGroupByShortname(shortname) {
  return models.GuardianGroup
    .findOne({
      where: { shortname },
      include: [{ all: true }]
    })
    .then((group) => {
      if (!group) { throw new sequelize.EmptyResultError('GuardianGroup with given shortname not found.'); }
      return group;
    });
}

function getAllGroups(extended) {
  let opts = {};
  if (extended) {
    opts.include = [{ all: true }];
  }
  return models.GuardianGroup
    .findAll(opts);
}

function getAllGuardiansByGuids(guids) {
  let proms = [];
  guids.forEach((guid) => {
    const prom = models.Guardian
      .findOne({ where: { guid } })
      .then((guardian) => {
        if (!guardian) { throw new sequelize.EmptyResultError(`Guardian with given guid not found: ${guid}`); }
        return guardian;
      });
    proms.push(prom);
  });
  return Promise.all(proms);
}

function doesGroupExist(shortname, name) {
  return models.GuardianGroup
    .findOne({
      where: {
        $or: {
          shortname,
          name
        }
      }
    })
    .then((group) => {
      return !!group;
    });
}

function createGroup(opts) {
  return validateCreateGroupParams(opts)
    .bind({})
    .then(data => {
      this.data = data;
      return doesGroupExist(data.shortname, data.name);
    })
    .then((exist) => {
      if (exist) {
        throw new ValidationError('Group with this shortname or name already exists.');
      }
      return models.GuardianGroup.create(this.data);
    })
    .then(group => {
      if (opts.guardians) {
        return updateGuardiansGroupRelations(group, opts);
      }
      return group.reload({ include: [{ all: true }] });
    })
}

function updateGroup(shortname, opts) {
  return validateGuardiansRelationsParams(opts)
    .bind({})
    .then((data) => {
      this.data = data;
      return getGroupByShortname(shortname);
    })
    .then((group) => {
      return updateGuardiansGroupRelations(group, this.data);
    });
}

function deleteGroupByShortname(shortname) {
  return models.GuardianGroup.destroy({ where: { shortname } });
}

function updateGuardiansGroupRelations(group, params) {
  return validateGuardiansRelationsParams(params)
    .bind({})
    .then(data => {
      return getAllGuardiansByGuids(data.guardians);
    })
    .then(guardians => {
      this.guardians = guardians;
      return clearGuardiansRelationsForGroup(group);
    })
    .then(() => {
      return attachGuardiansToGroup(this.guardians, group);
    })
    .then(() => {
      return group.reload({ include: [{ all: true }] });
    });
}

function formatGroup(group, extended) {
  let data = {
    shortname: group.shortname,
    name: group.name,
    description: group.description,
  };
  if (extended) {
    data.guardians = group.Guardians? group.Guardians.map((guardian) => {
      return {
        guid: guardian.guid,
        name: guardian.shortname,
      };
    }) : [];
  }
  return data;
}

function formatGroups(groups, extended) {
  return groups.map((group) => {
    return formatGroup(group, extended);
  });
}

function validateCreateGroupParams(data) {
  let transformedParams = {};
  let params = new Converter(data, transformedParams);

  params.convert('shortname').toString().trim().nonEmpty();
  params.convert('name').toString().trim().nonEmpty();
  params.convert('description').toString().trim().optional();

  return params.validate();
}

function validateGuardiansRelationsParams(data) {
  let transformedParams = {};
  let params = new Converter(data, transformedParams);

  params.convert('guardians').toArray();

  return params.validate();
};

function clearGuardiansRelationsForGroup(group) {
  return models.GuardianGroupRelation.destroy({ where: { guardian_group_id: group.id } });
}

function attachGuardiansToGroup(guardians, group) {
  let proms = [];
  guardians.forEach(guardian => {
    let prom = group.addGuardian(guardian);
    proms.push(prom);
  });
  return Promise.all(proms);
}

module.exports = {
  getGroupByShortname,
  getAllGroups,
  createGroup,
  updateGroup,
  deleteGroupByShortname,
  updateGuardiansGroupRelations,
  formatGroup,
  formatGroups,
};

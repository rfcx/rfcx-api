var models = require("../../models");
var sequelize = require("sequelize");
var Converter = require('../../utils/converter/converter');
var Promise = require("bluebird");
var ValidationError = require("../../utils/converter/validation-error");
var eventsService = require('../events/events-service');

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
      this.group = group;
      if (opts.guardians) {
        return updateGuardiansGroupRelations(group, opts);
      }
      return Promise.resolve(true);
    })
    .then(() => {
      if (opts.event_values) {
        return updateGuardianGroupEventValuesRelations(this.group, opts);
      }
      return Promise.resolve(true);
    })
    .then(() => {
      return this.group.reload({ include: [{ all: true }] });
    });
}

function updateGroup(shortname, opts) {
  return getGroupByShortname(shortname)
    .bind({})
    .then((group) => {
      this.group = group;
      return updateGuardiansGroupRelations(group, opts);
    })
    .then(() => {
      return updateGuardianGroupEventValuesRelations(this.group, opts);
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

function updateGuardianGroupEventValuesRelations(group, params) {
  return validateGuardianGroupEventValuesRelationsParams(params)
    .bind({})
    .then(data => {
      return eventsService.getAllGuardianAudioEventValuesByValues(data.event_values);
    })
    .then(eventValues => {
      this.eventValues = eventValues;
      return clearGuardianGroupEventValuesRelationsForGroup(group);
    })
    .then(() => {
      return attachEventValuesToGroup(this.eventValues, group);
    })
    .then(() => {
      return group.reload({ include: [{ all: true }] });
    });
}

function getAllGroupsForGuardianId(guardian_id) {
  return models.GuardianGroup.findAll({
    include: [
      {
        model: models.Guardian,
        where: { id: guardian_id }
      },
      {
        model: models.GuardianAudioEventValue,
      },
    ]
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
    data.event_values = group.GuardianAudioEventValues? group.GuardianAudioEventValues.map((eventValue) => {
      return eventValue.value;
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

function validateGuardianGroupEventValuesRelationsParams(data) {
  let transformedParams = {};
  let params = new Converter(data, transformedParams);

  params.convert('event_values').toArray();

  return params.validate();
};

function clearGuardianGroupEventValuesRelationsForGroup(group) {
  return models.GuardianGroupGuardianAudioEventValueRelation.destroy({ where: { guardian_group_id: group.id } });
}

function attachEventValuesToGroup(eventValues, group) {
  let proms = [];
  eventValues.forEach(value => {
    let prom = group.addGuardianAudioEventValue(value);
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
  getAllGroupsForGuardianId,
};

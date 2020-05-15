var models = require("../../models");
var sequelize = require("sequelize");
var Converter = require('../../utils/converter/converter');
var Promise = require("bluebird");
var ValidationError = require("../../utils/converter/validation-error");
const eventValueService = require('../events/event-value-service');
const eventTypeService = require('../events/event-type-service');
const siteService = require('../sites/sites-service');

let guardianGroupInclude = [
  {
    model: models.Guardian,
    as: 'Guardians',
    attributes: ['guid', 'shortname']
  },
  {
    model: models.GuardianAudioEventType,
    as: 'GuardianAudioEventTypes',
    attributes: ['value']
  },
  {
    model: models.GuardianAudioEventValue,
    as: 'GuardianAudioEventValues',
    attributes: ['value']
  },
  {
    model: models.GuardianSite,
    as: 'Site',
    attributes: ['guid'],
  }
];

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

function getGroupsByShortnames(shortnames) {
  let proms = [];
  shortnames.forEach((shortname) => {
    proms.push(getGroupByShortname(shortname));
  });
  return Promise.all(proms);
}

function getGroups(params) {
  let opts = {
    include: guardianGroupInclude
  };
  if (params.sites) {
    opts.include[3].where = {
      guid: {
        [models.Sequelize.Op.in]: params.sites
      }
    }
  }
  return models.GuardianGroup.findAll(opts);
}

function getAllGroups(extended) {
  let opts = {};
  if (extended) {
    opts.include = guardianGroupInclude;
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
        [models.Sequelize.Op.or]: {
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
      if (this.data.site) {
        return siteService.getSiteByGuid(this.data.site);
      }
      return Promise.resolve(null);
    })
    .then((site) => {
      if (site) {
        this.data.site = site.id;
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
      if (opts.event_types) {
        return updateGuardianGroupEventTypesRelations(this.group, opts);
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
      if (opts.site) {
        return siteService.getSiteByGuid(opts.site)
          .then((site) => {
            this.group.site = site.id;
            return this.group.save();
          });
      }
      return Promise.resolve();
    })
    .then(() => {
      return updateGuardiansGroupRelations(this.group, opts);
    })
    .then(() => {
      return updateGuardianGroupEventValuesRelations(this.group, opts);
    })
    .then(() => {
      return updateGuardianGroupEventTypesRelations(this.group, opts);
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
      return eventValueService.getAllGuardianAudioEventValuesByValues(data.event_values);
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

function updateGuardianGroupEventTypesRelations(group, params) {
  return validateGuardianGroupEventTypesRelationsParams(params)
    .bind({})
    .then(data => {
      return eventTypeService.getAllGuardianAudioEventTypesByValues(data.event_types);
    })
    .then(eventTypes => {
      this.eventTypes = eventTypes;
      return clearGuardianGroupEventTypesRelationsForGroup(group);
    })
    .then(() => {
      return attachEventTypesToGroup(this.eventTypes, group);
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
    data.event_types = group.GuardianAudioEventTypes? group.GuardianAudioEventTypes.map((eventType) => {
      return eventType.value;
    }) : [];
    data.site = group.Site? group.Site.guid : null;
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
  params.convert('site').toString().trim().optional();

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

function validateGuardianGroupEventTypesRelationsParams(data) {
  let transformedParams = {};
  let params = new Converter(data, transformedParams);

  params.convert('event_types').toArray();

  return params.validate();
};

function clearGuardianGroupEventValuesRelationsForGroup(group) {
  return models.GuardianGroupGuardianAudioEventValueRelation.destroy({ where: { guardian_group_id: group.id } });
}

function clearGuardianGroupEventTypesRelationsForGroup(group) {
  return models.GuardianGroupGuardianAudioEventTypeRelation.destroy({ where: { guardian_group_id: group.id } });
}

function attachEventValuesToGroup(eventValues, group) {
  let proms = [];
  (eventValues || []).forEach(value => {
    let prom = group.addGuardianAudioEventValue(value);
    proms.push(prom);
  });
  return Promise.all(proms);
}

function attachEventTypesToGroup(eventTypes, group) {
  let proms = [];
  (eventTypes || []).forEach(value => {
    let prom = group.addGuardianAudioEventType(value);
    proms.push(prom);
  });
  return Promise.all(proms);
}

module.exports = {
  getGroupByShortname,
  getGroupsByShortnames,
  getAllGroups,
  getGroups,
  createGroup,
  updateGroup,
  deleteGroupByShortname,
  updateGuardiansGroupRelations,
  formatGroup,
  formatGroups,
  getAllGroupsForGuardianId,
};

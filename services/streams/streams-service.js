const models = require("../../models");
const EmptyResultError = require('../../utils/converter/empty-result-error');
const sqlUtils = require("../../utils/misc/sql");
const Promise = require("bluebird");
const moment = require('moment-timezone');
const ForbiddenError = require("../../utils/converter/forbidden-error");

const streamQuerySelect =
  `SELECT stream.guid as guid, stream.name as name, stream.description as description, stream.starts as starts, stream.ends as ends,
  stream.created_at as created_at, visibility.value as visibility, user.guid as user_guid, user.email as user_email, user.firstname as user_firstname,
  user.lastname as user_lastname, location.guid as location_guid, location.name as location_name, location.latitude as location_latitude, location.longitude as location_longitude,
  location.description as location_description, site.guid as site_guid, site.name as site_name, site.timezone as site_timezone,
  MAX(segment.created_at) as last_ingest`;

const streamQueryJoins =
 `LEFT JOIN StreamVisibilities as visibility ON stream.visibility = visibility.id
  LEFT JOIN Users as user ON stream.created_by = user.id
  LEFT JOIN Locations as location ON stream.location = location.id
  LEFT JOIN Segments as segment ON stream.id = segment.stream
  LEFT JOIN GuardianSites as site ON stream.site = site.id`;

function prepareOpts(req) {

  return new Promise((resolve, reject) => {
    let order, dir;
    if (req.query.order) {
      order;
      dir = 'ASC';
      if (req.query.dir && ['ASC', 'DESC'].indexOf(req.query.dir.toUpperCase()) !== -1) {
        dir = req.query.dir.toUpperCase();
      }
      switch (req.query.order) {
        case 'time':
          order = 'segment.created_at';
          break;
        case 'name':
          order = 'stream.name';
          break;
        default:
          order = 'segment.created_at';
          break;
      }
    }

    let opts = {
      userGuid: req.rfcx.auth_token_info.guid,
      startingAfter: req.query.starting_after? moment.tz(req.query.starting_after, 'UTC').valueOf() : undefined,
      endingBefore: req.query.ending_before? moment.tz(req.query.ending_before, 'UTC').valueOf() : undefined,
      sites: req.query.sites? (Array.isArray(req.query.sites)? req.query.sites : [req.query.sites]) : undefined,
      access: req.query.access || 'personal', // personal | site | all.  Every next type includes all previous (e.g. "site" also includes "personal")
      limit: req.query.limit? parseInt(req.query.limit) : 10000,
      offset: req.query.offset? parseInt(req.query.offset) : 0,
      order: order? order : 'segment.created_at', // time | name
      dir: dir? dir : 'DESC',
    };

    try {
      opts.accessibleSites = req.rfcx.auth_token_info['https://rfcx.org/app_metadata'].accessibleSites;
    }
    catch(e) {
      opts.accessibleSites = [];
    }

    resolve(opts);
  });

}

function addGetQueryParams(sql, opts) {
  sql = sqlUtils.condAdd(sql, opts.startingAfter, ' AND stream.starts >= :startingAfter');
  sql = sqlUtils.condAdd(sql, opts.endingBefore, ' AND stream.ends <= :endingBefore');
  sql = sqlUtils.condAdd(sql, opts.access === 'personal', ' AND visibility.value = "private" AND user.guid = :userGuid');
  sql = sqlUtils.condAdd(sql, opts.access === 'site', ' AND ((visibility.value = "private" AND user.guid = :userGuid) OR (visibility.value = "site" AND site.guid IN (:accessibleSites))');
  sql = sqlUtils.condAdd(sql, opts.access === 'all', ' AND ((visibility.value = "private" AND user.guid = :userGuid) OR (visibility.value = "site" AND site.guid IN (:accessibleSites)) OR visibility.value = "public")');
  sql = sqlUtils.condAdd(sql, opts.sites, ' AND site.guid IN (:sites)');
  return sql;
}

function queryData(req) {

  return prepareOpts(req)
    .then((opts) => {
      let sql = `${streamQuerySelect} FROM Streams as stream ${streamQueryJoins} `;
      sql = sqlUtils.condAdd(sql, true, ' WHERE 1=1');
      sql = addGetQueryParams(sql, opts);
      sql = sqlUtils.condAdd(sql, true, ' GROUP BY stream.id');
      sql = sqlUtils.condAdd(sql, true, ' ORDER BY ' + opts.order + ' ' + opts.dir);
      sql = sqlUtils.condAdd(sql, true, ' LIMIT :limit OFFSET :offset');

      return models.sequelize
        .query(sql,
          { replacements: opts, type: models.sequelize.QueryTypes.SELECT }
        )
    })

}

function getStreamByGuid(guid, ignoreMissing) {
  return models.Stream
    .findOne({
      where: { guid: guid },
      include: [{ all: true }],
    })
    .then((item) => {
      if (!item && !ignoreMissing) { throw new EmptyResultError('Stream with given guid not found.'); }
      return item;
    });
}

function updateStream(stream, attrs) {
  console.log('updateStream', attrs);
  let allowedAttrs = ['name', 'description', 'starts', 'ends', 'location', 'site', 'visibility', 'max_sample_rate'];
  allowedAttrs.forEach((allowedAttr) => {
    if (attrs[allowedAttr] !== undefined) {
      console.log('update stream', allowedAttr, attrs[allowedAttr]);
      stream[allowedAttr] = attrs[allowedAttr];
    }
  });
  return stream.save()
    .then(() => {
      return stream.reload({ include: [{ all: true }] });
    });
}

function formatStream(stream) {
  let streamFormatted = {
    guid: stream.guid,
    name: stream.name,
    description: stream.description? stream.description : null,
    starts: stream.starts? stream.starts : null,
    ends: stream.ends? stream.starts : null,
    created_at: stream.created_at,
    location: stream.location? stream.location : null,
    visibility: stream.Visibility? stream.Visibility.value : null,
    created_by: stream.User?
      {
        firstname: stream.User.firstname,
        lastname: stream.User.lastname,
        guid: stream.User.guid,
        email: stream.User.email
      } : null,
    site: stream.Site?
      {
        guid: stream.Site.guid,
        name: stream.Site.name,
        timezone: stream.Site.timezone
      } : null,
  };
  return streamFormatted;
}

function createMasterSegment(opts) {
  return models.MasterSegment.create(opts)
    .then((dbMasterSegment) => {
      return dbMasterSegment.reload({ include: [{ all: true }] });
    });
}

function getMasterSegmentByGuid(guid, ignoreMissing) {
  return models.MasterSegment
    .findOne({
      where: { guid: guid },
      include: [{ all: true }],
    })
    .then((item) => {
      if (!item && !ignoreMissing) { throw new EmptyResultError('MasterSegment with given guid not found.'); }
      return item;
    });
}

function markStreamAsDeleted(dbStream) {
  return models.StreamVisibility.findOrCreate({
    where:    { value: 'deleted' },
    defaults: { value: 'deleted' }
  })
  .spread((dbStreamVisibility) => {
    if (!dbStreamVisibility) {
      throw new Error();
    }
    else {
      return updateStream(dbStream, { visibility: dbStreamVisibility.id });
    }
  })
}

function deleteSegmentsFromStream(dbStream) {
  return models.Segment
    .destroy({ where: { stream: dbStream.id } });
}

function deleteMasterSegmentsFromStream(dbStream) {
  return models.MasterSegment
    .destroy({ where: { stream: dbStream.id } });
}

function deleteStreamByGuid(guid) {
  return models.Stream
    .destroy({ where: { guid: guid } });
}

function formatMasterSegment(masterSegment) {
  return {
    guid: masterSegment.guid,
    filename: masterSegment.filename,
    format: masterSegment.Format? masterSegment.Format.value : null,
    duration: masterSegment.duration,
    sampleCount: masterSegment.sampleCount,
    sampleRate: masterSegment.SampleRate? masterSegment.SampleRate.value : null,
    channelCount: masterSegment.channelCount,
    channelLayout: masterSegment.ChannelLayout? masterSegment.ChannelLayout.value : null,
    bitRate: masterSegment.bitRate,
    codec: masterSegment.Codec? masterSegment.Codec.value : null,
  };
}

function formatSegment(segment) {
  return {
    guid: segment.guid,
    starts: segment.starts,
    ends: segment.ends,
    masterSegment: segment.MasterSegment? this.formatMasterSegment(segment.MasterSegment) : null,
    stream: segment.Stream? {
      guid: segment.Stream.guid,
      name: segment.Stream.name,
    } : null,
  };
}

function formatStreamsRaw(streams) {
  return streams.map(formatStreamRaw);
}

function formatStreamRaw(stream) {
  return {
    guid: stream.guid,
    name: stream.name,
    description: stream.description,
    starts: stream.starts,
    ends: stream.ends,
    created_at: stream.created_at,
    visibility: stream.visibility,
    last_ingest: stream.last_ingest,
    user: {
      guid: stream.user_guid,
      email: stream.user_email,
      firstname: stream.user_firstname,
      lastname: stream.user_lastname
    },
    location: {
      guid: stream.location_guid,
      name: stream.location_name,
      description: stream.location_description,
      latitude: stream.location_latitude,
      longitude: stream.location_longitude,
    },
    site: {
      guid: stream.site_guid,
      name: stream.site_name,
      timezone: stream.site_timezone
    },
  };
}

function formatStreams(streams) {
  return streams.map(formatStream);
}

function formatStream(stream) {
  return {
    guid: stream.guid,
    name: stream.name,
    description: stream.description,
    starts: stream.starts,
    ends: stream.ends,
    created_at: stream.created_at,
    visibility: stream.Visibility? stream.Visibility.value : null,
    user: stream.User? {
      guid: stream.User.guid,
      email: stream.User.email,
      firstname: stream.User.firstname,
      lastname: stream.User.lastname
    } : null,
    location: stream.Location? {
      guid: stream.Location.guid,
      name: stream.Location.name,
      description: stream.Location.description,
      latitude: stream.Location.latitude,
      longitude: stream.Location.longitude,
    } : null,
    site: stream.Site? {
      guid: stream.Site.guid,
      name: stream.Site.name,
      timezone: stream.Site.timezone
    } : null,
    sample_rate: stream.SampleRate? stream.SampleRate.value : null,
  };
}

function refreshStreamStartEnd(stream) {
  let starts, ends;
  return models.Segment.min('starts', { where: { stream: stream.id } })
    .then((segmentMin) => {
      starts = segmentMin;
      return models.Segment.max('ends', { where: { stream: stream.id } });
    })
    .then((segmentMax) => {
      ends = segmentMax;
      if (starts && ends) {
        return updateStream(stream, { starts, ends });
      }
      else {
        return Promise.resolve();
      }
    });
}

function refreshStreamMaxSampleRate(stream) {
  let sql = `SELECT b.id, b.value
             FROM MasterSegments a
             INNER JOIN SampleRates b ON a.sample_rate = b.id
             INNER JOIN ( SELECT id, MAX(value) max_sample_rate FROM SampleRates GROUP BY id) c ON b.id = c.id AND b.value = c.max_sample_rate
             WHERE a.stream = ${stream.id} ORDER BY b.value DESC LIMIT 1;`
  return models.sequelize
    .query(sql,
      { replacements: {}, type: models.sequelize.QueryTypes.SELECT }
    )
    .then((data) => {
      if (data && data[0] && data[0].id) {
        return updateStream(stream, { max_sample_rate: data[0].id });
      }
      return Promise.resolve(stream);
    });
}

function checkUserAccessToStream(req, dbStream) {
  let accessibleSites;
  try {
    accessibleSites = req.rfcx.auth_token_info['https://rfcx.org/app_metadata'].accessibleSites;
  }
  catch(e) {
    accessibleSites = [];
  }
  if (dbStream.Visibility.value === 'private' && dbStream.User.guid !== req.rfcx.auth_token_info.guid ||
      dbStream.Visibility.value === 'site' && !accessibleSites.includes(dbStream.Site.guid)) {
    throw new ForbiddenError(`You don't have access to this stream.`);
  }
  return true;
}

module.exports = {
  getStreamByGuid,
  updateStream,
  formatStream,
  createMasterSegment,
  getMasterSegmentByGuid,
  formatMasterSegment,
  formatSegment,
  queryData,
  formatStreamsRaw,
  formatStreamRaw,
  formatStreams,
  formatStream,
  refreshStreamStartEnd,
  refreshStreamMaxSampleRate,
  checkUserAccessToStream,
  deleteSegmentsFromStream,
  deleteMasterSegmentsFromStream,
  deleteStreamByGuid,
};

const models = require("../../models");
const EmptyResultError = require('../../utils/converter/empty-result-error');

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
  let allowedAttrs = ['name', 'description', 'starts', 'ends', 'location', 'site', 'visibility'];
  allowedAttrs.forEach((allowedAttr) => {
    if (attrs[allowedAttr] !== undefined) {
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
    visibility: stream.Visibiliy? stream.Visibiliy.value : null,
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
  return models.MasterSegment.create({
    guid: opts.guid,
    filename: opts.filename,
  })
}

function getMasterSegmentByGuid(guid, ignoreMissing) {
  return models.MasterSegment
    .findOne({
      where: { guid: guid }
    })
    .then((item) => {
      if (!item && !ignoreMissing) { throw new EmptyResultError('MasterSegment with given guid not found.'); }
      return item;
    });
}

function formatMasterSegment(masterSegment) {
  return {
    guid: masterSegment.guid,
    filename: masterSegment.filename
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

module.exports = {
  getStreamByGuid,
  updateStream,
  formatStream,
  createMasterSegment,
  getMasterSegmentByGuid,
  formatMasterSegment,
  formatSegment,
};

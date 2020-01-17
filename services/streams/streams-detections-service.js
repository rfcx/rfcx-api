const sqlUtils = require("../../utils/misc/sql");
const neo4j = require('../../utils/neo4j');

function getDetectionsByParams(opts) {

  opts.limit = opts.limit || 10000;
  opts.offset = opts.offset || 0;
  opts.order = opts.order || 'ev.audioMeasuredAt';
  opts.dir = 'ASC';

  let query = `MATCH (ev:event)<-[:contains]-(evs:eventSet)<-[:has_eventSet]-(ai:ai) `;
  query = sqlUtils.condAdd(query, true, ' MATCH (evs)-[:classifies]->(val:label)');
  query = sqlUtils.condAdd(query, true, ' WHERE 1=1');
  query = sqlUtils.condAdd(query, opts.starts, ' AND ev.audioMeasuredAt > {starts}');
  query = sqlUtils.condAdd(query, opts.ends, ' AND ev.audioMeasuredAt < {ends}');
  query = sqlUtils.condAdd(query, opts.values, ' AND val.value IN {values}');
  query = sqlUtils.condAdd(query, opts.guardians, ' AND ev.guardianGuid IN {guardians}');
  query = sqlUtils.condAdd(query, opts.models, ' AND ai.guid IN {models}');
  query = sqlUtils.condAdd(query, true, ' OPTIONAL MATCH (evs)-[:relates_to]->(aws:audioWindowSet)-[:contains]->(aw:audioWindow) WITH ev, evs, ai, val, COLLECT({guid: aw.guid, start: aw.start, end: aw.end, confidence: aw.confidence }) as windows');
  query = sqlUtils.condAdd(query, true, ' RETURN ev, ai, val.value as value, val.label as label, windows');
  query = sqlUtils.condAdd(query, true, ` ORDER BY ${opts.order} ${opts.dir}`);
  query = sqlUtils.condAdd(query, true, ` SKIP ${opts.offset} LIMIT ${opts.limit}`);

  const session = neo4j.session();
  return session.run(query, opts)
    .then(result => {
      session.close();
      let events = result.records.map((record) => {
        let event = record.get(0).properties;
        let ai = record.get(1).properties;
        event.aiName = ai.name;
        event.aiGuid = ai.guid;
        event.aiMinConfidence = ai.minConfidence;
        event.value = record.get(2);
        event.label = record.get(3);
        let windows = record.get(4);
        event.windows = (windows || [])
          .sort((a, b) => {
            return a.start - b.start;
          })
          .filter((win) => {
          return win.confidence > ai.minConfidence;
        });
        return event;
      });
      let detections = [];
      events.forEach((event) => {
        event.windows.forEach((win) => {
          let detection = {
            guid: win.guid,
            confidence: win.confidence,
            starts: event.audioMeasuredAt + win.start,
            ends: event.audioMeasuredAt + win.end,
            timezone: event.siteTimezone,
            value: {
              value: event.value,
              label: event.label
            },
            ai: {
              guid: event.aiGuid,
              name: event.aiName,
              minConfidence: event.aiMinConfidence,
            },
          };
          detections.push(detection);
        })
      });
      return detections;
    });

}

module.exports = {
  getDetectionsByParams,
}

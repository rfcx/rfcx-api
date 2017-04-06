var sequelize = require('../../models/index').sequelize;
var timeUtils = require("../../utils/misc/time");
module.exports = class SensationsRepository {
    constructor() {}
    create(params) {
      params.starting_after = timeUtils.momentToMysqlString(params.starting_after);
      params.ending_before = timeUtils.momentToMysqlString(params.ending_before);

      const sql = "INSERT INTO `Sensations`(\n" +
        "	`time` ,\n" +
        "	`location` ,\n" +
        "	`source_id` ,\n" +
        "	`source_type` ,\n" +
        "	`data_id` ,\n" +
        "	`data_type`\n" +
        ") SELECT\n" +
        "	time ,\n" +
        "	POINT(:latitude, :longitude) ,\n" +
        "	':source_id' ,\n" +
        "	':source_type' ,\n" +
        "	':data_id' ,\n" +
        "	':data_type'\n" +
        "FROM\n" +
        "	TimeAxis ta\n" +
        "WHERE\n" +
        "	ta.time >= :starting_after\n" +
        "AND ta.time <= :ending_before " +
        "ON DUPLICATE KEY UPDATE location=POINT(:latitude, :longitude), " +
        "source_id=':source_id', " +
        "source_type=':source_type', " +
        "data_id=':data_id', " +
        "data_type=':data_type'";

      return sequelize.query(sql, {replacements: params, type: sequelize.QueryTypes.Insert}).spread((results) => { return { success: true, sqlResult: results}})
    }
  getCoverage(params) {
    params.starting_after = timeUtils.momentToMysqlString(params.starting_after);
    params.ending_before = timeUtils.momentToMysqlString(params.ending_before);

    const sql = "SELECT\n" +
      "	min(t.time) as time,\n" +
      "	count(data_id) / count(*) AS coverage\n" +
      "FROM\n" +
      "	Sensations s\n" +
      "RIGHT JOIN TimeAxis t ON s.time = t.time\n" +
      "AND s.source_id = :source_id\n" +
      "AND s.source_type = :source_type\n" +
      "WHERE\n" +
      "	t.time >= :starting_after\n" +
      "AND t.time <  :ending_before\n" +
      "GROUP BY\n" +
      "	UNIX_TIMESTAMP(t.time) DIV :interval\n" +
      "	ORDER BY time\n";

    return sequelize.query(sql, {replacements: params, type: sequelize.QueryTypes.SELECT});
  }


};
var sequelize = require('../../models/index').sequelize;
var timeUtils = require("../../utils/misc/time");
module.exports = class SensationsRepository {
    constructor() {}
    create(createOptions) {
      createOptions.begins_at = timeUtils.dateTimeToMysqlString(createOptions.begins_at);
      createOptions.ends_at = timeUtils.dateTimeToMysqlString(createOptions.ends_at);

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
        "	ta.time >= :begins_at\n" +
        "AND ta.time <= :ends_at " +
        "ON DUPLICATE KEY UPDATE location=POINT(:latitude, :longitude), " +
        "source_id=':source_id', " +
        "source_type=':source_type', " +
        "data_id=':data_id', " +
        "data_type=':data_type'";

      return sequelize.query(sql, {replacements: createOptions, type: sequelize.QueryTypes.Insert}).spread((results) => { return { success: true, sqlResult: results}})
    }


};
#### To create new table
To create new table in MySQL, the only thing you will need is to create new model file in `noncore/_models/`.
If you need to add any associations to another tables, put them into `defineRelationships` function in `models/relationships.js`.

#### To update existing table

To alter a table or to drop a table, you will need to create migration file in `noncore/_cli/migrations`.

```
npx sequelize migration:create --migrations-path ./noncore/_cli/migrations --name remove-column-x
```

IMPORTANT: When adding a new column, you must check for existence before. (If not, the migration will fail when the table is created by a sequelize sync on a fresh install.) Template:

```
module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async t => {
      const exists = await queryInterface.sequelize.query(`
        SELECT 1 FROM information_schema.COLUMNS
        WHERE table_name = 'Guardians' AND column_name = 'last_ping' AND table_schema = 'rfcx_api'
      `, { plain: true, transaction: t })
      if (!exists) {
        await queryInterface.sequelize.query(`
          ALTER TABLE Guardians ADD last_ping datetime(3) NULL AFTER last_check_in
        `, { transaction: t })
      }
    })
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('Guardians', 'last_ping')
  }
}
```

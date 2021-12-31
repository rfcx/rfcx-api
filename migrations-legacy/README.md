#### To create new table
To create new table in MySQL, the only thing you will need is to create new model file in `models-legacy/`.
If you need to add any associations to another tables, put them into `defineRelationships` function in `models/relationships.js`.

#### To update existing table

To add a new column to a table, (similar to creating a table) you only need to update the model file. DO NOT CREATE A MIGRATION!

To make a change to a column or delete a column/table, you will need to create migration file in `migrations-legacy`.

```
npx sequelize migration:create --migrations-path ./migrations-legacy --name remove-column-x
```

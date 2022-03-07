#### To create new table or update an existing table

Follow the instructions in the Sequelize docs to create a migration in the `migrations` folder, or use an existing migration as a template.

To test it:

```
npm run sync-timescale
```

To undo it:

```
npx sequelize db:migrate:undo
```

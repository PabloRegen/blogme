'use strict';

let config = require('./config.json');

module.exports = {
    client: 'postgresql',
    connection: {
        hostname: config.database.hostname,
        database: config.database.database,
        username: config.database.username,
        password: config.database.password
    },
    pool: {
        min: 2,
        max: 10
    },
    migrations: {
        tableName: 'knex_migrations'
    }
};
'use strict'
const { Client } = require('pg');

const {
    POSTGRES_USER,
    POSTGRES_HOST,
    POSTGRES_READER_HOST,
    POSTGRES_DB,
    POSTGRES_PASS,
    POSTGRES_READER_PASS,
    POSTGRES_PORT,
    // POSTGRES_SCHEMA,
} = process.env

exports.pg_execute = (query, values, writeMode) => {
    return new Promise(async (resolve, reject) => {
        console.log("Postgres: executer");

        const client = new Client({
            user: POSTGRES_USER,
            host: writeMode ? POSTGRES_HOST : POSTGRES_READER_HOST,
            database: POSTGRES_DB,
            password: writeMode ? POSTGRES_PASS : POSTGRES_READER_PASS,
            port: POSTGRES_PORT,
        });

        console.log("Postgres: client configured");
        try {
            await client.connect();
            console.log("Postgres: client connected");
            let result = []
            // If single query
            if (typeof query === "string") {
                console.log("Postgres: executing query");
                result = await client.query(query, values);
                console.log("Postgres: executed query");
            }
            // Assuming list of queries
            else {
                console.log("Postgres: executing queries");
                for (let i = 0; i < query.length; i++) {
                    result.push(await client.query(query[i], values[i]));
                }
                console.log("Postgres: executed queries");
            }
            client.end();
            return resolve(result);
        } catch (err) {
            console.log("Postgres: error", err);
            client.end();
            return reject(err);
        }
    });
};

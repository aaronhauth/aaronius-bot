import * as pg from 'pg';
const Pool = pg.default.Pool;

export class dbClient {
    pgClient = null;
    constructor() {
        console.log(`constructor with ${process.env.DATABASE_URL}`)
        this.pgClient = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
              rejectUnauthorized: false
            }
          });
    }

    async queryTables() {
        console.log("querying tables?");
        try {
          const res = await this.pgClient.query('SELECT table_schema,table_name FROM information_schema.tables;');
          for (let row of res.rows) {
            console.log(JSON.stringify(row));
          }
        } catch (err) {
          throw err;
        } 
    }

    async getAccessToken(accessTokenName) {
      try {
        const {rows} = await this.pgClient.query('SELECT * FROM access_tokens where access_token_name = $1;', [accessTokenName]);
        return rows;
      } catch (err) {
        throw err;
      }
    }

    async updateAccessToken(accessTokenName, accessToken) {
      try {
        await this.pgClient.query('UPDATE access_tokens SET access_token=$2 where access_token_name = $1;', [accessTokenName, accessToken]);
        return;
      } catch (err) {
        throw err;
      }
    }
}
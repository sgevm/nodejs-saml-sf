require("dotenv").config();
const Pool = require("pg").Pool;

console.log('...db.js...');

const dbConfig = {
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  max: 10,
  idleTimeoutMillis: 1*60*60*1000,
}

const isProduction = process.env.NODE_ENV === "production";
const connectionString = `postgresql://${process.env.PG_USER}:${process.env.PG_PASSWORD}@${process.env.PG_HOST}:${process.env.PG_PORT}/${process.env.PG_DATABASE}`;
var pool;
if(isProduction){
  console.log('...db.js...production');
  pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false,
    }
  });  
}else{
  console.log('...db.js...development');
  pool = new Pool(dbConfig);
}

pool.on('error', function (err) {
  console.error('idle client error', err.message, err.stack)
});

module.exports = pool;

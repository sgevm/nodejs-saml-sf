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

console.log('...db...dbConfig:');
console.log(dbConfig);

const isProduction = process.env.NODE_ENV === "production";
const connectionString = `postgresql://${process.env.PG_USER}:${process.env.PG_PASSWORD}@${process.env.PG_HOST}:${process.env.PG_PORT}/${process.env.PG_DATABASE}`;
//const connectionString = process.env.DATABASE_URL; //HEROKU_POSTGRES
var pool;
if(isProduction){
  console.log('...db.js...production');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL, //HEROKU_POSTGRES
    ssl: {
        rejectUnauthorized: false,
    }
  });  
}else{
  console.log('...db.js...development');
  pool = new Pool(dbConfig);
  (async function() {
    try{
        const client = await pool.connect();
        await client.query('SELECT NOW()', (err, res) => {          
          console.log('...db...SELECT NOW()');
          if(err){
            console.log('...db...SELECT NOW()...err:');
            console.log(err);  
          }else{
            console.log('...db...SELECT NOW()...res:');
            console.log(res.rows[0]);  
          }
          client.release();
        });        
    }catch(e){
      console.log('...db...pool.connect.error');
      console.log(err);  
    }
  })();

}

pool.on('error', function (err) {
  console.error('idle client error', err.message, err.stack)
});

module.exports = pool;

const pool = require("../models/db");

const runDBInit = async () => {
    console.log('...db_init...runDBInit');
    var client;
    try{
      client = await pool.connect();
      console.log('...db_init...pool.connect.SUCCESS!!');
      try{
        const res = await client.query('SELECT NOW()');
        console.log('...db_init...SELECT NOW().res:');
        console.log(res.rows[0]);
      }catch(err){
        console.log('...db_init...SELECT NOW().err:');
        console.log(err);  
      }
      try{
          const res2 = await client.query("CREATE TABLE IF NOT EXISTS saml_users\
          (\
              userId text PRIMARY KEY,\
              username text NOT NULL,\
              email text NOT NULL,\
              createddt timestamp,\
              updateddt timestamp\
          )");
          console.log('...db_init...Create table SUCCESS!!');
      }catch(err){
        console.log('...db_init...Create table error:');
        console.log(err);  
      }
      client.release();
    }catch(err){
      console.log('...db_init...pool.connect.error');
      console.log(err);  
    }
}

module.exports = runDBInit;
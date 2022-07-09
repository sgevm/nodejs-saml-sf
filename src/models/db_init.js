const pool = require("../models/db");

const runDBInit = async () => {
    console.log('...db_init...runDBInit');
    pool.connect(function(err, client, done){
        console.log('...db_init...pool.connect');
        if(err){
            console.log('...db_init...pool.connect.error');
            console.log(err);  
        }
        client.query('SELECT NOW()', (err, res) => {
          console.log('...db_init...SELECT NOW()');
          if(err){
            console.log('...db_init...err:');
            console.log(err);  
          }else{
            console.log('...db_init...res:');
            console.log(res.rows[0]);  
          }
        });
      });

    pool.query("CREATE TABLE IF NOT EXISTS users\
    (\
        id SERIAL PRIMARY KEY,\
        email text NOT NULL,\
        password text NOT NULL,\
        createddt timestamp,\
        updateddt timestamp\
    )",(err, res)=>{
        if (err) {
            console.log('Create table error !');
            console.log(err);  
        }else{
            console.log('Create table result;');
            //console.log(res);
        }
    });
}

module.exports = runDBInit;
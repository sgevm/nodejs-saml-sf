const dotenv = require("dotenv").config();
const redis = require("redis");

const runApplication = async () => {
    //Redis configurations
    var redisClientConfig = { 
        socket: {
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT,
            tls: false
        },
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD
    };
    console.log(redisClientConfig);

    // const redisURL = `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;
    // console.log(redisURL);
    //const redisClient = redis.createClient(redisURL);
    const redisClient = redis.createClient(redisClientConfig);

    redisClient.connect().then(()=>{
        console.log('redis connection successful!!!');
    }).catch((err)=>{
        console.log('redis connection error !!!');
        console.log(err);
    });
    
    await redisClient.set('foo', 'bar').then(()=>{
        console.log('redis key-val set!!!');
    });

};

runApplication();
const dotenv = require("dotenv").config()
const express = require("express");
const session = require("express-session");
const redis = require("redis");
const connectRedis = require("connect-redis");
const passport = require("passport");
const runDBInit = require("./models/db_init");

require("./passport")(passport);
var app = express();

//app middleware
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


//Redis configurations
var redisClientConfig = { 
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        tls: false
    },
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    legacyMode: true
};

const redisClient = redis.createClient(redisClientConfig);
redisClient.on('error', err => {
    console.log('redisClient . Error ' + err);
});

redisClient.on('connect', err => {
    console.log('redisClient.on(connect)');
});

redisClient.connect().then(()=>{
    console.log('redisClient.connect().then ... successful');
    redisClient.set('framework', 'ReactJS');
    const RedisStore = connectRedis(session);

    //postgres db init
    console.log('calling db_init.runDBInit()');
    runDBInit();
    console.log('after db_init.runDBInit()');
    console.log('process.env.NODE_ENV:'+process.env.NODE_ENV);
   
    var cookieConfig={
        //domain: process.env.SESSION_COOKIE_DOMAIN, //".sg-nodejs-template.herokuapp.com":"localhost"
        secure: process.env.NODE_ENV==="production",  // if true only transmit cookie over https
        httpOnly: true, // if true prevent client side JS from reading the cookie
        sameSite: process.env.NODE_ENV==="production"?"none":"lax",
        maxAge: 14400000 // session max age in milliseconds. 4 Hours = 4*60*60*1000
    };
    console.log('cookieConfig:', cookieConfig);

    app.set('trust proxy', 1);    
    app.use(
        session({
            store: new RedisStore({ client: redisClient }),
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: true,
            cookie: cookieConfig
        })
    );
    app.use(passport.initialize());
    app.use(passport.session());

    //Configure session middleware
    //passportConfig();

    //Router middleware
    require("./routes")(app, passport);
    
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
     console.log(`.....................Server started at port ${PORT}.....................`);
    });   

}).catch(err => { 
    console.log('redisClient.connect().catch ... error');
    console.log(err); 
});


 

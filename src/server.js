const dotenv = require("dotenv").config()
const express = require("express");
const session = require("express-session");
const redis = require("redis");
const connectRedis = require("connect-redis");
const passport = require("passport");
const runDBInit = require("./models/db_init");

const app = express();
const PORT = process.env.PORT || 3000;

const router = require("./routes/index");
const { passportConfig } = require("./utils/passport");

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

redisClient.connect().then(()=>{
    console.log('redisClient.connect().then ... successful');
    const RedisStore = connectRedis(session);

    //postgres db init
    console.log('calling db_init.runDBInit()');
    runDBInit();
    
    //Configure session middleware
    passportConfig();
    
    app.use(
        session({
            store: new RedisStore({ client: redisClient }),
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: true,
            cookie: {
                domain: process.env.NODE_ENV === "production"?".herokuapp.com":"localhost",
                secure: process.env.NODE_ENV==="production",  // if true only transmit cookie over https
                httpOnly: true, // if true prevent client side JS from reading the cookie
                maxAge: 14400000 // session max age in milliseconds. 4 Hours 94*60*60*1000
            }
        })
    );
    app.use(passport.initialize());
    app.use(passport.session());
    
    
    //Router middleware
    app.use(router);
    
    app.listen(PORT, () => {
     console.log(`Server started at port ${PORT}`);
    });   

}).catch(err => { 
    console.log('redisClient.connect().catch ... error');
    console.log(err); 
});


 

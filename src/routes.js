//const redis = require("redis");
const jwt = require('jsonwebtoken');
const axios = require('axios');
const fs = require('fs');
const path = require('path');


var payload = {
  iss: process.env.CLIENT_ID,
  sub: process.env.SF_USERNAME,//dynamic users this must be the username
  aud: process.env.LOGIN_URI,
  exp: Math.floor(Date.now() / 1000) + 60 * 3
}; 
console.log('path:', path.join(__dirname,'server.key'));
var privateKey = fs.readFileSync(path.join(__dirname,'server.key'));
var token = jwt.sign(payload, privateKey, { algorithm: 'RS256' }); 
var payloadString = `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${token}`;
 
const axiosConfig = {
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
};


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

const redisClient = require("redis").createClient(redisClientConfig);
redisClient.connect();

const myPromise = new Promise(function(resolve, reject) {
  resolve(10);
});

const getRedisSessions = () => {
  return new Promise(function(resolve, reject) {
    redisClient.keys('*', (err, keys) => {
      if (err) reject(err);
      if(keys){
        resolve(keys);
      }else{
        resolve([]);
      }
    });
  });
};

const getAllExpressionSessions = (req) =>{
  return new Promise((resolve, reject)=>{
    req.sessionStore.all((err, sessions)=>{
      if (err) {
        resolve(err);
      }
      if (sessions) {
        

      var allSessions = sessions.map(sess => {
        var obj={id: sess.id};
        if (sess.passport) {
          obj["username"]=sess.passport.user.username;
        }
        return obj;
      });
      resolve(allSessions);
      }else{
        resolve([]);
      }//if(sessions)
    });
  });
};

const getSalesforceAccessToken = () => {
  return new Promise((resolve, reject) => {
      axios.post(process.env.TOKEN_URI, payloadString, axiosConfig).then((grant)=>{
        resolve(grant.data);
      }).catch((err)=>{
        reject(err);
      });
  });
}

const getSalesforceAPI = (data) => {
  return new Promise((resolve, reject) => {
      const axiosConfigGET = {
        headers: {
          'Authorization': 'Bearer ' + data.access_token,
        },
      };
      const resourceURL = data.instance_url+'/services/data/v54.0/query/?q=SELECT+FirstName,LastName,Account.Name+FROM+Contact+WHERE+AccountId<>NULL+LIMIT+10';
      axios.get(resourceURL, axiosConfigGET).then((result)=>{
      resolve(result.data);
    }).catch((err)=>{
      reject(err);
    });
  });
}

const getSalesforceContacts = () => {
  return new Promise((resolve, reject) => {
      getSalesforceAccessToken().then((data)=>{
        getSalesforceAPI(data).then((result)=>{
          resolve(result.records);
        }).catch((err)=>{
          reject(err);
        });
      }).catch((err)=>{
        reject(err);
      });
  });
};

module.exports = function(app, passport) {

  const logger = (req, res, next)=>{
    console.log('...logger...', req.originalUrl, '- isAuthenticated():' + req.isAuthenticated(), req.session, ' query:', req.query);
    next();
  };

  app.get("/", logger, function(req, res) { 
    if (req.isAuthenticated()) {
      res.render("home", {
        user: req.user,
        isAuthenticated: req.isAuthenticated,
        sessionID: req.sessionID,
        activeTab: "Home"
      });
    } else {
      res.render("home", {user: null});
    }
  });

  app.get("/sessions", logger, async (req, res, next) => { 
    console.log('/sessions . sessions . req.isAuthenticated():', req.isAuthenticated());
    if (req.isAuthenticated()) {      
      //const sessions = await getRedisSessions();
      const sessions = await getAllExpressionSessions(req);
      console.log('/sessions:', sessions);

      res.render("sessions", {
        user: req.user,
        isAuthenticated: req.isAuthenticated,
        sessionID: req.sessionID,
        sessions: sessions

      });
    } else {
      // console.log('/sessions . home');
      // res.render("home", {user: null});
      next();
    }
  },passport.authenticate('saml', {
    successRedirect: "/sessions",
    failureRedirect: "/",
    failureFlash: true
  }), 
  (req, res, next)=>{
    console.log('/sessions ... after...', req.session);
    res.redirect("/sessions");
  });

  app.get("/contacts", logger, async (req, res) => { 
    if (req.isAuthenticated()) {      
      const contacts = await getSalesforceContacts();
      //console.log('/contacts:', contacts);

      res.render("contacts", {
        user: req.user,
        isAuthenticated: req.isAuthenticated,
        sessionID: req.sessionID,
        contacts: contacts
      });
    } else {
      console.log('/contacts . home');
      res.render("home", {user: null});
    }
  });

  app.get("/login", 
    logger,
    passport.authenticate('saml', {
      //successRedirect: "/",
      failureRedirect: "/",
      failureFlash: true
    }), 
    (req, res, next)=>{
      console.log('/login ... after...', req.session);
      res.redirect("/");
    }
  );

  app.post(
    '/saml/callback',
    logger,
    passport.authenticate('saml', {
      //successRedirect: "/",
      failureRedirect: "/",
      failureFlash: true
    }),
    function(req, res) {
      console.log("/saml/callback...after...", req.session);
      res.redirect("/");
    }
  );


  app.get("/logout", function(req, res) {
    if (req.session) {
      req.session.destroy(err => {
        if (err) {
          res.status(400).send('Unable to log out')
        } else {
          res.redirect("/");
        }
      });
    }
  });

  app.get("/clearsessions", function(req, res) {
    if (req.session) {
      req.sessionStore.clear(err => {
        if (err) {
          res.status(400).send('Unable to clear sessions')
        } else {
          res.redirect("/sessions");
        }
      });
    }
  });

};

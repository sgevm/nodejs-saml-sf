//const redis = require("redis");
const jwt = require('jsonwebtoken');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { log } = require('console');


var payload = {
  iss: process.env.CLIENT_ID,
  sub: process.env.SF_USERNAME,//dynamic users this must be the username
  aud: process.env.LOGIN_URI,
  exp: Math.floor(Date.now() / 1000) + 60 * 3
}; 

const oauthPayload= { 
  grant_type: process.env.OAUTH_GRANT_TYPE,
  code: code,
  client_id: process.env.OAUTH_CLIENT_ID,
  client_secret: process.env.OAUTH_CLIENT_SECRET,
  redirect_uri: process.env.OAUTH_CLIENT_SECRET,
  response_type: process.env.OAUTH_RESPONSE_TYPE,
  login_hint: process.env.OAUTH_LOGIN_HINT
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

const getSalesforceAPI = (access_token, instance_url) => {
  return new Promise((resolve, reject) => {
      const axiosConfigGET = {
        headers: {
          'Authorization': 'Bearer ' + access_token,
        },
      };
      const resourceURL = instance_url+'/services/data/v54.0/query/?q=SELECT+FirstName,LastName,Account.Name+FROM+Contact+WHERE+AccountId<>NULL+LIMIT+10';
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
        getSalesforceAPI(data.access_token, data.instance_url).then((result)=>{
          resolve(result.records);
        }).catch((err)=>{
          reject(err);
        });
      }).catch((err)=>{
        reject(err);
      });
  });
};

const getSFoAuthContacts = (access_token, instance_url) => {
  return new Promise((resolve, reject) => {
        getSalesforceAPI(access_token, instance_url).then((result)=>{
          resolve(result.records);
        }).catch((err)=>{
          reject(err);
        });
  });
};

const getSFoAuthAuthorization = () => {
  return new Promise((resolve, reject) => {
    
      const payload= { 
        client_id: process.env.OAUTH_CLIENT_ID,
        redirect_uri: process.env.OAUTH_REDIRECT_URI,
        response_type: process.env.OAUTH_RESPONSE_TYPE,
        login_hint: process.env.OAUTH_LOGIN_HINT
      };
      const payloadstr=`client_id=${oauthPayload.client_id}&redirect_uri=${oauthPayload.redirect_uri}&response_type=${oauthPayload.response_type}&login_hint=${oauthPayload.login_hint}`;
      axios.post(process.env.OAUTH_AUTH_URI, payloadstr, axiosConfig).then((result)=>{
      resolve(result.data);
    }).catch((err)=>{
      reject(err.response.data);
    });
  });
}
const getSFoAuthToken = (code) => {
  return new Promise((resolve, reject) => {
      const payloadstr=`grant_type=${oauthPayload.grant_type}&code=${oauthPayload.code}&client_id=${oauthPayload.client_id}&client_secret=${oauthPayload.client_secret}&redirect_uri=${oauthPayload.redirect_uri}&response_type=${oauthPayload.response_type}&login_hint=${oauthPayload.login_hint}`;
      axios.post(process.env.OAUTH_TOKEN_URI, payloadstr, axiosConfig).then((result)=>{
      resolve(result.data);
    }).catch((err)=>{
      reject(err.response.data);
    });
  });
}

module.exports = function(app, passport) {

  const logger = (req, res, next)=>{
    console.log('...logger...', req.originalUrl, '- isAuthenticated():' + req.isAuthenticated(), req.session, ' query:', req.query, ' body:', req.body);
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
        contacts: contacts,
        access_token: req.session.access_token,
        refresh_token: req.session.refresh_token
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

  app.get(
    '/authorize',
    logger,async (req, res) => { 
      if (req.isAuthenticated()) {
        try{
          const data = await getSFoAuthAuthorization();     
          res.send(data);
        }catch(e){
          console.log('/authorize . error:', e);
          res.json(e);
        }        
      }else{
        res.sendStatus(200);
      }
    }
  );

app.get(
  '/oauth/callback',
  logger, async (req, res, next)=>{
    const code = req.query.code;
    if (typeof code!=='undefined') {
      const result = await getSFoAuthToken(code);
      req.session.access_token = result.access_token;
      req.session.refresh_token = result.refresh_token;
      req.session.instance_url = result.instance_url;
      res.redirect('/oauthcontacts');   
    }else{
      res.redirect('/home');
    }
    
  }
);

app.get("/oauthcontacts", logger, async (req, res) => { 
  if (req.isAuthenticated()) {
    if (req.session.access_token && req.session.instance_url) {
      const contacts = await getSFoAuthContacts(req.session.access_token, req.session.instance_url);

      res.render("oauthcontacts", {
        user: req.user,
        isAuthenticated: req.isAuthenticated,
        sessionID: req.sessionID,
        contacts: contacts,
        access_token: req.session.access_token,
        refresh_token: req.session.refresh_token,
        instance_url: req.session.instance_url
      });      
    }else{
      res.render("oauthcontacts", {
        user: req.user,
        isAuthenticated: req.isAuthenticated,
        sessionID: req.sessionID
      });
    }

  } else {
    res.render("home", {user: null});
  }
});

};

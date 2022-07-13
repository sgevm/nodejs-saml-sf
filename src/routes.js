//const redis = require("redis");

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
          console.log('...sess.passport...', sess.passport);
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

module.exports = function(app, passport) {

  const logger = (req, res, next)=>{
    console.log('...logger...', req.originalUrl, '- isAuthenticated():' + req.isAuthenticated(), req.session);
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

  app.get("/sessions", logger, async (req, res) => { 
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
      console.log('/sessions . home');
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

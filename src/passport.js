//https://codesandbox.io/s/252zx?file=/config/passport.js:0-1640
const SamlStrategy = require("passport-saml").Strategy;
const pool = require("./models/db");

module.exports = function(passport) {
  passport.serializeUser(function(user, done) {
    console.log('passport.serializeUser . user:',user);
    done(null, { id: user.id, username: user.username, email: user.email });
  });

  passport.deserializeUser(function(user, done) {
    console.log('passport.deserializeUser . user:', user);
    pool.query('SELECT userId, username, email FROM saml_users WHERE userId=$1',[user.id],(err, res)=>{
        if (err) {
            done(err, false);
        }
        var user = res.rows[0];
        process.nextTick(function() {
          return done(null, user);
        });
    });
  });

  passport.use(
    new SamlStrategy(
      {
        path: process.env.SAML_CALLBACK_URL,
        entryPoint: process.env.SAML_ENTRYPOINT,
        issuer: process.env.SAML_ISSUER,
        cert: process.env.SAML_CERT, // cert must be provided
        identifierFormat: process.env.SAML_IDENTIFIER_FORMAT
      },
      function(profile, done) {
        console.log("This is what is returned by Saml", profile);
        pool.query('SELECT userId, username, email FROM saml_users WHERE username=$1',[profile.username],(err, res)=>{
          if (err) {
              done(err, false);
          }
          if (res.rows.length==0) {          
            pool.query('INSERT INTO saml_users(userId, username, email, createddt, updateddt) VALUES($1,$2,$3,NOW(),NOW())',[profile.userId, profile.username, profile.email],(err)=>{
            if (err) {
              console.log('INSERT error...');
              done(err, false);
            }else{
              console.log('INSERT Successful!!');
              return done(null, {id:profile.userId, username:profile.username, email:profile.email});
            }      
            });          
          }else{
            var user = res.rows[0];
            console.log('User found!!');
            console.log(user);
            return done(null, {id:user.userid, username:user.username, email:user.email}); 
          }
        });
      }
    )
  );

  
};


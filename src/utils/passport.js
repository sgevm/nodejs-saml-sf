const LocalStrategy = require("passport-local/lib").Strategy;
const passport = require("passport");
const pool = require("../models/db");
const bcrypt = require("bcryptjs");

module.exports.passportConfig = () => {
 passport.use(
   new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
     async (email, password, done) => {
        console.log('LocalStrategy . email: '+email + ' . password: '+password);
        pool.query('SELECT id, email, password FROM users WHERE email=$1',[email],(err, res)=>{
            if (err) {
              console.log('LocalStrategy . err: ');
              console.log(err);
                done(err, false);
            }
            //console.log(res);
            const user = res.rows[0];
            if (!user) {
                console.log('LocalStrategy . !user');
                console.log(res);              
                return done(null, false, { message: "Invalid credentials.\n" });
            }else{
              console.log('LocalStrategy . user.email:' + user.email);
            }
            if (!bcrypt.compareSync(password, user.password)) {
                console.log('LocalStrategy . password not matching');       
                return done(null, false, { message: "Invalid credentials.\n" });
            }
            console.log('LocalStrategy . user.match.found');
              return done(null, {id:user.id, email: user.email});
        });      
    }
   )
 );

 passport.serializeUser((user, done) => {
  console.log('passport.serializeUser');
  console.log(user);
   done(null, user.id);
 });

 passport.deserializeUser(async (id, done) => {
  console.log('passport.deserializeUser . id:' + id);
    pool.query('SELECT id, email FROM users WHERE id=$1',[id],(err, res)=>{
        if (err) {
            done(err, false);
        }
        done(null, res.rows[0]);
    });
 });
};
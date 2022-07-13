const pool = require("../models/db");

exports.Logging = async (req, res, next) => {
    console.log('...logging...' + req.method + ' - '+ req.originalUrl + ' - ' + req.sessionID);
    next();
};

exports.HomePage = async (req, res) => {
    console.log('HomePage:');
    console.log(req.user);
    console.log(req.session);
    if (!req.user) {
        console.log('HomePage: !req.user');
        return res.redirect("/");
    }
    console.log('HomePage: render home');
    res.render("home", {
      sessionID: req.sessionID,
      sessionExpireTime: new Date(req.session.cookie.expires) - new Date(),
      isAuthenticated: req.isAuthenticated(),
      user: req.user,
    });
};
   
exports.LoginPage = async (req, res) => {
    res.render("auth/samllogin");
};
   

exports.Logout = (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return console.log(err);
      }
      res.redirect("/");
    });
};
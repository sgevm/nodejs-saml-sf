const pool = require("../models/db");
const bcrypt = require("bcryptjs");

exports.Signup = async (req, res) => {
    try {
        const { email, password } = req.body;

        //generate hash salt for password
        const salt = await bcrypt.genSalt(12);

        //generate the hashed version of users password
        const hashed_password = await bcrypt.hash(password, salt);

        pool.query(
            "INSERT INTO users(email, password) VALUES($1, $2) RETURNING *",[email, hashed_password],
            (err, result) => {
                if(err){
                    console.log('Error in creating new user');
                    console.log(err);
                }
                if (result) {
                    res.status(201).json({ message: "new user created!" });  
                }
            }
        );
    } catch (e) {
        console.log(e);
    }
};

exports.HomePage = async (req, res) => {
    if (!req.user) {
      return res.redirect("/");
    }
    res.render("home", {
      sessionID: req.sessionID,
      sessionExpireTime: new Date(req.session.cookie.expires) - new Date(),
      isAuthenticated: req.isAuthenticated(),
      user: req.user,
    });
};
   
exports.LoginPage = async (req, res) => {
    res.render("auth/login");
};
   
exports.registerPage = async (req, res) => {
    res.render("auth/register");
};


exports.Logout = (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return console.log(err);
      }
      res.redirect("/");
    });
};
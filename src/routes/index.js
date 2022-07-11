const express = require("express");
const passport = require("passport");
const {
 Signup,
 HomePage,
 LoginPage,
 registerPage,
 Logout,
} = require("../controllers");


const router = express.Router();

router.route("/").get(LoginPage);
router.route("/register").get(registerPage);
router.route("/home").get(HomePage);
router.route("/api/v1/signin").post(
    passport.authenticate("local", {
        failureRedirect: "/",
        successRedirect: "/home",
    })
);
router.route("/api/v1/signup").post(Signup);
router.route("/logout").get(Logout);

module.exports = router;
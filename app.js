require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const ejs = require('ejs');

// sessions
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

// connect-flash
const flash = require('connect-flash');

// make instance of express app
const app = express();

// set app configs
app.use(express.static("public"));
app.use(express.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(flash());

// initialize session
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

// initialize passport to manage sessions
app.use(passport.initialize());
app.use(passport.session());

// set mongoDB connection via mongoose
const options = { useUnifiedTopology: true, useNewUrlParser: true, useCreateIndex: true };
mongoose.connect("mongodb://localhost:27017/userDB", options);

// define USER schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String
});

// add passport plugin to user schema
userSchema.plugin(passportLocalMongoose);

// create model from schema
const User = new mongoose.model("User", userSchema);

// let passport handle User auth
 passport.use(User.createStrategy());
 passport.serializeUser(User.serializeUser());
 passport.deserializeUser(User.deserializeUser());

 // passport authenticate options
 const authOptions = {
     failureFlash: "Invalid username or password.",
     failureRedirect: "/login"
 };


// root route
app.get("/", (req, res) => {
  res.render("home");
});


// login route
app.route("/login")
   .get((req, res) => {
        res.render("login", {message: req.flash('error') });
   })

   // POST LOGIN - 2 functions as parameters (auth and callback)
   .post(passport.authenticate("local", authOptions), (req, res) => {
        res.redirect("/secrets");
   }); // END of POST LOGIN


app.route("/logout")
   .get((req, res) => {
        req.logout();
        res.redirect("/");
   });


// register route
app.route("/register")
   .get((req, res) => {
        res.render("register", { message: "" });
   })

   // REGISTER POST METHOD
   .post((req, res) => {
     const user = new User({ username: req.body.username});

      User.register(user, req.body.password, (err, acc) => {
        if (err)
            res.render("register", { message: err.message });
        else
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            });
      });
   }); // REG POST METHOD END


// secrets page route
app.route("/secrets")
   .get((req, res) => {
        if (req.isAuthenticated())
            res.render("secrets");
        else
            res.redirect("/login");
   });


// run server on given port
app.listen(80, () => {
  console.log("Server started on Port 80.");
});


function echo(object) {
  console.log(object);
};

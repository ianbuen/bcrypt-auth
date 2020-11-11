require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const ejs = require('ejs');

// sessions
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')

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
  password: String,
  googleID: String,
  secrets: [{type: String}]
});

// add passport plugin to user schema + findOrCreate
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// create model from schema
const User = new mongoose.model("User", userSchema);

// let passport handle User local auth
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

 // let passport handle User auth via google
 passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleID: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

 // passport options for local auth
 const authOptions = {
     failureFlash: "Invalid username or password.",
     failureRedirect: "/login"
 };


// root route
app.get("/", (req, res) => {
  if (req.isAuthenticated())
      res.redirect("/secrets");
  else
      res.render("home");
});

// variable used for messages (ie. "You need to login first")
let message = "";

// login route
app.route("/login")
   .get((req, res) => {
        if (req.isAuthenticated())
            return res.redirect("/secrets");

        if (message != "") {
            const msg = message;
            message = "";
            return res.render("login", {message: msg});
        }

        res.render("login", {message: req.flash('error')});
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
       if (req.isAuthenticated())
           return res.redirect("/secrets");

        res.render("register", { message: "" });
   })

   // REGISTER POST METHOD
   .post((req, res) => {
     const user = new User({ username: req.body.username});

      User.register(user, req.body.password, (err, acc) => {
        if (err)
            return res.render("register", { message: err.message });

        passport.authenticate("local")(req, res, () => {
            res.redirect("/secrets");
            message = "";
        });
      });
   }); // REG POST METHOD END


// secrets page route
app.route("/secrets")
   .get((req, res) => {
        if (req.isAuthenticated()) {
            User.find({ secrets: {$ne: null} }, (err, foundUsers) => {
              if (err)
                  console.log(err);
              else
                  res.render("secrets", { users: foundUsers });
            });

        } else {
            message = "You need to login first.";
            res.redirect("/login");
          }
   });

 // submit page ROUTES
 app.route("/submit")
    .get((req, res) => {
      if (req.isAuthenticated())
          res.render("submit");
      else {
          message = "You need to login first.";
          res.redirect("/login");
      }
    })

    .post((req, res) => {
      // retrieve the input
      const secret = req.body.secret;

      // get current User
      const currentUser = req.user;

      // add the new secret to user's secret list
      currentUser.secrets.push(secret);

      // save changes to user after updating list of secrets
      currentUser.save((err) => {
        if (err)
            console.log(err);
        else
            res.redirect("/secrets");
      });
    });


//========= GOOGLE SIGN-IN ROUTES ===================
app.get("/auth/google",
 passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/secrets",
   passport.authenticate("google", { failureRedirect: "/login" }),
   function(req, res) {
     // Successful authentication, redirect to secrets.
     res.redirect("/secrets");
});


// run server on given port
app.listen(80, () => {
  console.log("Server started on Port 80.");
});


function echo(object) {
  console.log(object);
};

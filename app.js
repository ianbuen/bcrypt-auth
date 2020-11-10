require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const ejs = require('ejs');

// use bcrypt encryption
const bcrypt = require('bcrypt');
const saltRounds = 10;

// make instance of express app
const app = express();

// set app configs
app.use(express.static("public"));
app.use(express.urlencoded({extended: true}));
app.set("view engine", "ejs");

// set mongoDB connection via mongoose
const options = { useUnifiedTopology: true, useNewUrlParser: true };
mongoose.connect("mongodb://localhost:27017/userDB", options);

// define USER schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

// create model from schema
const User = new mongoose.model("User", userSchema);

// root route
app.get("/", (req, res) => {
  res.render("home");
});


// login route
app.route("/login")
   .get((req, res) => {
        res.render("login");
   })
   .post((req, res) => {

        const email = req.body.username;
        const pass = req.body.password;

        User.findOne({ email: email }, (err, foundUser) => {
            if (err)
                console.log(err);
            else if (foundUser) {
                bcrypt.compare(pass, foundUser.password, function(err, match) {
                    if (match)
                        res.redirect("/secrets");
                    else // incorrect password
                        console.log("Incorrect Username / Password.");
                });
            } else // user does not exist
                console.log("Incorrect Username / Password.");
        });
   });


app.route("/logout")
   .get((req, res) => {
        res.redirect("/");
   });


// register route
app.route("/register")
   .get((req, res) => {
        res.render("register");
   })
   .post((req, res) => {
        bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
          const user = new User({
            email: req.body.username,
            password: hash
          });

          user.save((err) => {
            if (!err)
                res.redirect("/secrets");
            else
                console.log(err);
          });
        });
   });


// secrets page route
app.route("/secrets")
   .get((req, res) => {
        res.render("secrets");
   });


// run server on given port
app.listen(80, () => {
  console.log("Server started on Port 80.");
});

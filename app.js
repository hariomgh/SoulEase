//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
const md5 = require("md5");
const bcrypt = require('bcryptjs');
const saltRounds = 10;
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
var findOrCreate = require('mongoose-findorcreate')
require('dotenv').config()
// Gitignore and commits remaining lect 381
//  timestamp 11 : 00
// console.log(process.env.API_KEY);


const app = express();              // creating new app instance named as express
app.set('view engine', 'ejs');      // setting view engine to use ejs
app.use(bodyParser.urlencoded({      // using bodyParser to parse our requests
  extended: true
}));  
app.use(express.static("public"));    // using public directory to store our static files

app.use(session({
    secret:"Our little secret",
    resave:false,
    saveUninitialized:false,
    useUnifiedTopology: true 
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true,useUnifiedTopology: true});
mongoose.set("useCreateIndex",true);

const userSchema = new mongoose.Schema({
    email:String,
    passsword:String,
    googleId:String,
    secret:String
});

userSchema.plugin(passportLocalMongoose);       // HAsh and salt our password
userSchema.plugin(findOrCreate)
// const secret = process.env.SECRET;
// userSchema.plugin(encrypt, { secret:secret,encryptedFields: ['passsword'] })
// userSchema.plugin(encrypt, { secret:secret,encryptedFields: ['passsword'] });


const User = new mongoose.model("User",userSchema); 

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
   done(null, user.id);
  });
  passport.deserializeUser(function(id, done) {
    User.findById(id, function (err, user) {
      done(err, user);
    });
  });

  passport.use(new GoogleStrategy({
    clientID:process.env.CLIENT_ID,
    clientSecret:process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    passReqToCallback   : true,
    userProfileUrl :"https://www.googleapis.com/oauth2/v3/userinfo"
  },


  function(request, accessToken, refreshToken, profile, done) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));



//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Routes ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect("/login");
  }
})
app.get("/",function(req,res){
1
    // res.send("<h1> Hello Kaise hain aaap log </h1> ");
    res.render("home");
});

app.get("/login",function(req,res){
    // res.send("login");
    res.render("login");
});
app.get("/register",function(req,res){
    // res.send("register");
    res.render("register");
});

// app.get("/secrets",function(req,res){
//     if(req.isAuthenticated()){
//         res.render("secrets");
//     }else{
//         res.redirect("/login"); 
//     }
// });


app.get("/secrets",function(req,res){
  User.find({"secret":{$ne:null}},function(err,foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        res.render("secrets",{userWithSecrets:foundUser})
      }
    }
  })
});
// app.get("/auth/google",function(req,res){
//   passport.authenticate("google",{scope:["profile"]});
// })

app.get('/auth/google',
passport.authenticate('google',{scope:["profile"]})
);

app.get( '/auth/google/secrets',
    passport.authenticate( 'google', {
        successRedirect: '/secrets',
        failureRedirect: '/login'
}));


app.get("/logout",function(req,res){
    req.logout(function(err){
        if(err){
            console.log(err);
        }else{
            res.redirect("/");
        }
    });
});
app.post("/submit",function(req,res){
  const submittedSecret = req.body.secret;
  // console.log(req.user);
  
  User.findById(req.user.id,function(err,foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
})
// app.post("/register",function(req,res){
    
//     bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
         
//         const newUser = User({
//             email:req.body.username,
//             passsword:hash
//         });

//         const Saved = newUser.save();
//             if(Saved){
//                 if(!Saved){
//                     console.log(err);
//                 }else{
//                     res.render("secrets");
//                 }
//         }
//     });
    
   
// });

// app.post("/login",function(req,res){
//     const userName = req.body.username;
//     // const password_inp = md5(req.body.password);
//     const password_inp =req.body.password;

//     User.findOne({ email: userName })
//   .then((result) => {
//         bcrypt.compare(password_inp, result.passsword, function(err, matched) {
//             if(matched === true)    
//                 res.render("secrets");
//         });
//     })
//   .catch((error) => {
//     console.error(error);
//   });

// }); 


app.post("/register",function(req,res){
    User.register({username:req.body.username},req.body.password,function(err,result){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
          passport.authenticate("local")(req,res,function(){
            res.redirect("/secrets");
          });
        }
    })
})



// app.post("/login",function(req,res){
//     const user = new User({
//         email : req.body.username,
//         passsword :req.body.password

//     });

//     req.login(user,function(err){
//         if(err){
//             console.log(err);
//         }else{
//             passport.authenticate("local"); 
//         }
//     });

// })

// app.post("/login", passport.authenticate("local"), function(req, res){
//     res.redirect("/secrets");
// });

app.post("/login", function(req, res){
    //check the DB to see if the username that was used to login exists in the DB
    User.findOne({username: req.body.username}, function(err, foundUser){
      //if username is found in the database, create an object called "user" that will store the username and password
      //that was used to login
      if(foundUser){
      const user = new User({
        username: req.body.username,
        password: req.body.password
      });
        //use the "user" object that was just created to check against the username and password in the database
        //in this case below, "user" will either return a "false" boolean value if it doesn't match, or it will
        //return the user found in the database
        passport.authenticate("local", function(err, user){
          if(err){
            console.log(err);
          } else {
            //this is the "user" returned from the passport.authenticate callback, which will be either
            //a false boolean value if no it didn't match the username and password or
            //a the user that was found, which would make it a truthy statement
            if(user){
              //if true, then log the user in, else redirect to login page
              req.login(user, function(err){
              res.redirect("/secrets");
              });
            } else {
              res.redirect("/login");
            }
          }
        })(req, res);
      //if no username is found at all, redirect to login page.
      } else {
        //user does not exists
        res.redirect("/login")
      }
    });
  });
  


app.listen(3000, function() {
  console.log("Server started on port 3000");
});

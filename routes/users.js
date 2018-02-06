var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var User = require('../models/userModel');
var Product = require('../models/productModel');
var Cart = require('../models/cartModel');
var async = require('async');
var nodemailer = require('nodemailer');
var bcryptNode = require('bcrypt-nodejs');
var crypto = require('crypto');

// function to ensure the route is authenticated
function ensureAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		return next();
	} else {
		//req.flash('error_msg','You are not logged in');
		res.redirect('/users/login');
	}
}

// Get Routes

// Register
router.get('/register', function(req, res){
	res.render('register');
});

// orders
router.get('/orders',ensureAuthenticated,function(req,res){
	res.render('orders');
});
// Login
router.get('/login', function(req, res){
	res.render('login');
});

// get forgot page
router.get('/forgot',function(req,res){
	res.render('forgot',{user:req.user});
});

// Checkout view
router.get('/checkout',ensureAuthenticated,function(req,res,next){
	if(!res.locals.session.cart){
		return res.render('cart',{products : null});
	}else{
		var cart = new Cart(res.locals.session.cart);
		res.render('checkout',{total:cart.totalPrice});
	}
});


// cart view
router.get('/cart', ensureAuthenticated, function(req,res,next){
	if(!res.locals.session.cart) {
		return res.render('cart',{products : null})
	}else{
		var cart = new Cart(req.session.cart);
		res.render('cart', { products:cart.generateArray(), totalPrice:cart.totalPrice})
	}
});

// add to Cart
router.get('/add-to-cart/:id', ensureAuthenticated, function(req, res,next){
	var productId = req.params.id;
	var cart = new Cart(req.session.cart ? req.session.cart : {});

	Product.findById(productId, function(err,product){
		if(err){
			res.redirect('/');
		}else{
			cart.add(product, product.id);
			req.session.cart = cart;
			res.redirect('/');
			console.log(req.session.cart);

		}
	});
});



// Posts Routes

// forgot Posts
router.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error_msg', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      })
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          // add your email here
						user: 'add you email here',
            // add your password here
	          pass: 'your password'
				}
      });
      var mailOptions = {
        to: user.email,
        from: 'thorat.rohit95@gmail.com',
        subject: 'Edshop Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success_msg', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/users/login');
  });
});


// Register User
router.post('/register', function(req, res){
	var name = req.body.name;
	var email = req.body.email;
	var username = req.body.username;
	var password = req.body.password;
	var password2 = req.body.password2;

	// Validation
	req.checkBody('name', 'Name is required').notEmpty();
	req.checkBody('email', 'Email is required').notEmpty();
	req.checkBody('email', 'Email is not valid').isEmail();
	req.checkBody('username', 'Username is required').notEmpty();
	req.checkBody('password', 'Password is required').notEmpty();
	req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

	var errors = req.validationErrors();

	if(errors){
		res.render('register',{
			errors:errors
		});
	} else {
		var newUser = new User({
			name: name,
			email:email,
			username: username,
			password: password
		});

		User.createUser(newUser, function(err, user){
			if(err) throw err;
			console.log(user);
		});

		req.flash('success_msg', 'You are registered and can now login');

		res.redirect('/users/login');
	}
});


// Passport Strategy
passport.use(new LocalStrategy(
  function(username, password, done) {
   User.getUserByUsername(username, function(err, user){
   	if(err) throw err;
   	if(!user){
   		return done(null, false, {message: 'User not Registered'});
   	}

   	User.comparePassword(password, user.password, function(err, isMatch){
   		if(err) throw err;
   		if(isMatch){
   			return done(null, user);
   		} else {
   			return done(null, false, {message: 'Invalid password'});
   		}
   	});
   });
  }));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.getUserById(id, function(err, user) {
    done(err, user);
  });
});

router.post('/login',
  passport.authenticate('local', {successRedirect:'/', failureRedirect:'/users/login',failureFlash: true}),
  function(req, res) {
    res.redirect('/');
  });

router.get('/logout', function(req, res){
	req.logout();
	req.flash('success_msg', 'You are logged out');
  req.session.destroy();


	res.redirect('/users/login');
});

module.exports = router;
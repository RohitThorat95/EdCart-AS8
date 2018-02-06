var express = require('express');
var router = express.Router();
var Product = require('../models/productModel');
var mongoose = require('mongoose');



// Get Homepage
router.get('/', ensureAuthenticated, function(req, res){
	Product.find(function(err,prod){
		// console.log(prod);
		// res.send(prod);
		res.render('index', { products : prod });
	});
});

// Particular Product View
router.get('/singleView/:productId',function(req,res){
	Product.findOne({'_id':req.params.productId},function(err,result){
		if(err){
			console.log(err);
		}else{
			res.render('singleView',{result : result});
		}
	});
});

// creating products
router.post('/create',ensureAuthenticated, function(req,res){
	var imagePath = req.body.imagePath;
	var title = req.body.title;
	var price = req.body.price;

		var products = [];

			var newProduct = new Product({
				imagePath : imagePath,
				title     : title,
				price     : price
			});

			newProduct.save(function(err,product){
				if(err){
					console.log(err);
				}else{
					console.log(product);
				}
			});

			products.push(newProduct);
			var done = 0;
			for(var i=0 ; i < products.length; i++){
			  products[i].save(function(err,result){
			    done++;
			  });
			}
			res.redirect('/');
	 });

// delete a product
router.get('/delete/:productId', ensureAuthenticated, function(req,res){
	Product.remove({'_id':req.params.productId},function(err,result){
		if(err){
			console.log(err);
		}else{
			// res.send(result);
			res.redirect('/');
    }
	});
});

// Edit product
// Please check this in POSTMAN
router.put('/editProduct/:productId',function(req,res){
	var edit=req.body;
	Product.findOneAndUpdate({'_id':req.params.productId},edit,function(err,result){
		if(err){
			res.send(err)
		}else{
			res.send(result);
		}
	});
});

// function to ensure route in authenticated
function ensureAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		return next();
	} else {
		//req.flash('error_msg','You are not logged in');
		res.redirect('/users/login');
	}
}



module.exports = router;

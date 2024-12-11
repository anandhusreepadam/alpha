const userController = require('../controllers/user/userController');
const profileController = require('../controllers/user/profileController');
const cartController = require ('../controllers/user/cartController');
const orderController = require('../controllers/user/orderController');
const express = require('express');
const router = express.Router();
const passport = require('passport');
const { userAuth, profileAuth } = require('../middlewares/auth');
const multer = require('multer');
const upload = multer();

////Route Tester
const working = (req,res,next)=>{
console.log('Route is working fine');
next();
}



////404
router.get('/pageNotFound',userAuth,userController.pageNotFound);


///Load Authentication pages
router.get('/login',userController.loadLogin);
router.post('/login',userController.login);
router.get('/signup',userController.loadSignup);
router.post('/signup',userController.signup);
router.post('/verify-otp',userController.verifyOtp);
router.post('/resend-otp',userController.resendOtp);
router.get('/forgotPassword',userController.loadForgotPassword);
router.post('/forgotPassword',userController.forgotPassword);
router.post('/verifyForgotOtp',userController.verifyForgotOtp);
router.get('/resetPassword',userController.loadResetPassword);
router.post('/resetPassword',userController.resetPassword);
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
});
router.get('/logout',userController.logout);


//Load User Pages
router.get('/',userAuth,userController.loadHomepage);
router.get('/shop',userAuth,userController.loadShopping);
router.get('/product/:id',userAuth,userController.loadProductPage);
router.get('/wishlist',userAuth,userController.loadWishlist);


//Profile Management
router.get('/profile',profileAuth,userAuth,userController.loadProfile);
router.get('/changePassword',profileAuth,userAuth,profileController.loadChangePassword);
router.post('/changePassword',profileAuth,userAuth,profileController.changePassword);


//Address Management
router.get('/address',profileAuth,userAuth,profileController.loadAddress);
router.post('/saveUserData',upload.none(),profileController.saveUserData)
router.post('/addAddress',upload.none(),profileController.addAddress);
router.get('/editAddress',profileAuth,userAuth,profileController.loadEditAddress);
router.post('/editAddress',upload.none(),profileController.editAddress);
router.post('/deleteAddress',profileController.deleteAddress)


//Cart Management
router.get('/cart',profileAuth,userAuth,cartController.loadCart);
router.post('/cart',cartController.updateCart);
router.post('/addToCart',cartController.addToCart);
router.post('/removeCartItem',cartController.deleteCart);


//Order Management
router.get('/checkout',profileAuth,userAuth,orderController.loadCheckout);
router.post('/placeOrder',orderController.placeOrder);
router.get('/orderPlaced',profileAuth,userAuth,orderController.orderPlaced)
router.get('/orders',profileAuth,userAuth,orderController.loadOrders)
router.post('/cancelOrder/:id',orderController.cancelOrder);
router.get('/orderDetails',profileAuth,userAuth,orderController.loadOrderDetails)







//For testing only
router.get('/test',(req,res)=>{
    res.render('test',{addresses:[],title:'test',user:null,cart:{items:[]},orderSummary:[]})
})


module.exports=router
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const passport = require('passport');
const { userAuth, profileAuth } = require('../middlewares/auth');


////Route Tester
const working = (req,res,next)=>{
console.log('Route is working fine')
}


////404
router.get('/pageNotFound',userAuth,userController.pageNotFound)


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
router.post('/resetPassword',userController.resetPassword)
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
});
router.get('/logout',userController.logout);


//Load User Pages
router.get('/',userAuth,userController.loadHomepage);
router.get('/profile',profileAuth,userAuth,userController.loadProfile);
router.get('/shop',userAuth,userController.loadShopping);
router.get('/product/:id',userAuth,userController.loadProductPage);
router.get('/cart',userAuth,userController.loadCart);
router.get('/wishlist',userAuth,userController.loadWishlist);


module.exports=router
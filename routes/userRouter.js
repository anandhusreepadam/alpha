const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const passport = require('passport');
const { userAuth } = require('../middlewares/auth');


////Route Tester
const working = (req,res,next)=>{
console.log('Route is working fine')

}

router.get('/pageNotFound',userController.pageNotFound)
router.get('/',userAuth,userController.loadHomepage)
router.get('/signup',userController.loadSignup);
router.post('/signup',userController.signup)
router.post('/verify-otp',userController.verifyOtp)
router.post('/resend-otp',userController.resendOtp)
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
});

//Load User Pages
router.get('/login',userController.loadLogin);
router.post('/login',userController.login);
router.get('/logout',userController.logout);
router.get('/shop',userAuth,userController.loadShopping)
router.get('/profile',userAuth,userController.loadProfile)
router.get('/product/:id',userAuth,userController.loadProductPage)



module.exports=router
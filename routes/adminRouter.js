const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const {userAtuth,adminAuth}=require('../middlewares/auth');
const customerController= require('../controllers/admin/customerController');



router.get('/pageError',adminController.pageError)
router.get('/login',adminController.loadLogin)
router.post('/login',adminController.login);
router.get('/',adminAuth,adminController.loadDashboard)
router.get('/logout',adminController.logout);

router.get('/users',adminAuth,customerController.customerInfo);
router.get('/blockCustomer',adminAuth,customerController.customerBlocked);
router.get('/unBlockCustomer',adminAuth,customerController.customerUnblocked);





module.exports=router
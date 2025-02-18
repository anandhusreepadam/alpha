const express = require('express');
const router = express.Router();
const {userAtuth,adminAuth}=require('../middlewares/auth');

//tester
const working = (req,res,next)=>{
console.log('route working')
next();
}

//Multer
const multer = require('multer');
const storage = require('../helpers/multer');
const uploads = multer({storage:storage});

//Controllers
const adminController = require('../controllers/admin/adminController');
const customerController= require('../controllers/admin/customerController');
const categoryController= require('../controllers/admin/categoryController');
const productController = require('../controllers/admin/productController');
const orderController = require('../controllers/admin/orderController');
const stockController = require('../controllers/admin/stockController');
const couponController = require('../controllers/admin/couponController');

//Admin Routes
router.get('/pageError',adminController.pageError)
router.get('/login',adminController.loadLogin)
router.post('/login',adminController.login);
router.get('/',adminAuth,adminController.loadDashboard)
router.get('/logout',adminController.logout);

//Dashboard
router.get('/product/sales-data',adminAuth,adminController.productDashboard)
router.get('/category/sales-data',adminAuth,adminController.categoryDashboard)
router.get('/top-selling-products',adminAuth,adminController.topSellingProducts)
router.get('/top-selling-categories',adminAuth,adminController.topSellingCategories)


//User Management
router.get('/users',adminAuth,customerController.customerInfo);
router.get('/blockCustomer',adminAuth,customerController.customerBlocked);
router.get('/unBlockCustomer',adminAuth,customerController.customerUnblocked);


//Category Management
router.get('/category',adminAuth,categoryController.categoryInfo);
router.post('/category',adminAuth,categoryController.addCategory);
router.post('/addCategoryOffer',adminAuth,categoryController.addCategoryOffer);
router.post('/removeCategoryOffer',adminAuth,categoryController.removeCategoryOffer);
router.get('/listCategory',adminAuth,categoryController.getListCategory);
router.get('/unlistCategory',adminAuth,categoryController.getUnlistCategory);
router.get('/editCategory',adminAuth,categoryController.getEditCategory);
router.post('/editCategory',adminAuth,categoryController.editCategory);
router.post('/deleteCategory/:id',adminAuth,categoryController.deleteCategory);


//Product Management
router.get('/addProducts',adminAuth,productController.getProductAddPage);
router.post('/addProducts',adminAuth,uploads.array('images',4),productController.addProducts);
router.get('/products',adminAuth,productController.getAllProducts);
router.post('/addProductOffer',adminAuth,productController.addProductOffer);
router.post('/removeProductOffer',adminAuth,productController.removeProductOffer);
router.get('/blockProduct',adminAuth,productController.blockProduct);
router.get('/unblockProduct',adminAuth,productController.unblockProduct);
router.get('/editProduct',adminAuth,productController.getEditProduct);
router.post('/editProduct/:id',adminAuth,uploads.array('images',4),productController.editProduct);
router.post('/deleteImage',adminAuth,productController.deleteSingleImage);
router.post('/deleteProduct/:id',adminAuth,productController.deleteProduct);


//Order Management
router.get('/orders',adminAuth,orderController.loadOrders);
router.get('/viewOrder',adminAuth,orderController.orderDetails);
router.post('/updateStatus',adminAuth,orderController.updateStatus)

//Stock Management
router.get('/stock',adminAuth,stockController.loadStock);
router.post('/updateStock',adminAuth,stockController.updateStock)


//Coupon Management
router.get('/coupons',adminAuth,couponController.loadCoupons);
router.post('/coupons',adminAuth,couponController.createCoupon);
router.delete('/coupons/:id',adminAuth,couponController.deleteCoupon)

//Report
router.get('/report',adminAuth,adminController.loadReport);
router.post('/salesReport',adminController.salesReport);
router.post('/generate-pdf', adminController.generatePdf);
router.post('/generate-excel', adminController.generateExcel);

//Page 404
router.use(adminController.pageError)

module.exports=router

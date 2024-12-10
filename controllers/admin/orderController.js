const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');


const loadOrders = async(req,res)=>{
    try {
        res.render('orders',{title:'Orders',user})
    } catch (error) {
        
    }
};





module.exports = {
    loadOrders,
};
const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');



const pageError = async (req, res) => {
    try {
        return res.render('admin-error')
    } catch (error) {

    }
}

const loadLogin = (req, res) => {
    const msg = req.session.pass;
    req.session.pass = null;
    if (req.session.admin) {
        return res.redirect('/admin');
    }
    res.render('admin-login', { message: msg });
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email, isAdmin: true });
        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password);
            if (passwordMatch) {
                req.session.admin = true;
                return res.redirect('/admin');
            } else {
                req.session.pass = "Wrong Password";
                return res.redirect('/admin/login')
            }
        } else {
            req.session.pass = "Invalid Admin Credential"
            return res.redirect('/admin/login')
        }
    } catch (error) {
        console.log('login error', error);
        return res.redirect('/pageError')
    }
}

const loadDashboard = async (req, res) => {
    if (req.session.admin) {
        try {
            res.render('dashBoard');

        } catch (error) {
            res.redirect('/pageerror')
        }
    }
}

const logout = async (req, res) => {
    try {
        req.session.destroy(err => {
            if (err) {
                console.log('Error destroying session', err);
                return res.redirect('/pageError')
            }
            res.redirect('/admin/login')
        });
    } catch (error) {
        console.log("Unexpected error during logout", error)
        res.redirect('/pageError')
    }
}

const loadReport = async (req, res) => {
    try {
        res.render('report')
    } catch (error) {
        console.log(error)
        res.status(500).json(error);
    }
}
const salesReport = async (req, res) => {

    const { startDate, endDate, filterType } = req.body;

    try {
        let filter = {};

        if (startDate && endDate) {
            filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        } else if (filterType) {
            const now = new Date();
            if (filterType === 'daily') {
                filter.createdAt = { $gte: new Date(now.setDate(now.getDate() - 1)) };
            } else if (filterType === 'weekly') {
                filter.createdAt = { $gte: new Date(now.setDate(now.getDate() - 7)) };
            } else if (filterType === 'monthly') {
                filter.createdAt = { $gte: new Date(now.setMonth(now.getMonth() - 1)) };
            }
        }

        const orders = await Order.find(filter);

        const totalSalesCount = orders.length;
        const totalOrderAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalDiscounts = orders.reduce((sum, order) => sum + (order.discount || 0), 0);

        const reportOrders = orders.map(order => ({
            orderId: order.orderId,
            date: order.createdAt,
            totalAmount: order.totalAmount,
            discount: order.discount || 0,
            finalAmount: order.totalAmount - (order.discount || 0),
        }));

        res.json({
            success: true,
            totalSalesCount,
            totalOrderAmount,
            totalDiscounts,
            orders: reportOrders,
        });
    } catch (error) {
        console.error('Error generating sales report:', error);
        res.status(500).json({ success: false, message: 'Failed to generate report.' });
    }
}

module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout,
    loadReport,
    salesReport
}
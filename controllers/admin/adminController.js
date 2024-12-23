const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
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


//Sales Report

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

const generatePdf = async (req, res) => {
    const { startDate, endDate, filterType, orders, totalSalesCount, totalOrderAmount, totalDiscounts } = req.body;
    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');

    doc.pipe(res);
    doc.fontSize(18).text('Sales Report', { align: 'center' });
    doc.fontSize(12).text(`Date Range: ${startDate} to ${endDate}`, { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(12).text(`Total Sales Count: ${totalSalesCount}`);
    doc.text(`Total Order Amount: ₹${totalOrderAmount}`);
    doc.text(`Total Discounts: ₹${totalDiscounts}`);
    doc.moveDown(1);
    doc.text('Order Details:', { fontSize: 14, underline: true });
    doc.moveDown(0.5);

    const tableHeaders = ['No.', 'Order ID', 'Order Date', 'Total Amount', 'Discount Applied', 'Final Amount'];
    tableHeaders.forEach((header, index) => {
        doc.text(header, { continued: index !== tableHeaders.length - 1 });
        if (index < tableHeaders.length - 1) doc.text(' | ', { continued: true });
    });
    doc.moveDown(0.5);
    orders.forEach((order, index) => {
        doc.text(`${index + 1}. ${order.orderId}`, { continued: true });
        doc.text(` | ${new Date(order.date).toLocaleDateString()}`, { continued: true });
        doc.text(` | ₹${order.totalAmount}`, { continued: true });
        doc.text(` | ₹${order.discount}`, { continued: true });
        doc.text(` | ₹${order.finalAmount}`);
    });

    doc.end();
}

const generateExcel = async (req, res) => {
    const { startDate, endDate, filterType, orders, totalSalesCount, totalOrderAmount, totalDiscounts } = req.body;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    worksheet.mergeCells('A1:E1');
    worksheet.getCell('A1').value = 'Sales Report';
    worksheet.getCell('A1').font = { size: 18, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:E2');
    worksheet.getCell('A2').value = `Date Range: ${startDate} to ${endDate}`;
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.addRow([]);
    worksheet.addRow([`Total Sales Count: ${totalSalesCount}`]);
    worksheet.addRow([`Total Order Amount: ₹${totalOrderAmount}`]);
    worksheet.addRow([`Total Discounts: ₹${totalDiscounts}`]);
    worksheet.addRow([]);
    worksheet.addRow(['No.', 'Order ID', 'Order Date', 'Total Amount', 'Discount Applied', 'Final Amount']);
    orders.forEach((order, index) => {
        worksheet.addRow([
            index + 1,
            order.orderId,
            new Date(order.date).toLocaleDateString(),
            order.totalAmount,
            order.discount,
            order.finalAmount
        ]);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="sales_report.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
}



module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout,
    loadReport,
    salesReport,
    generatePdf,
    generateExcel,
}
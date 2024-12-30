const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');



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
    try {
        // Calculate total revenue
        const totalRevenue = await Order.aggregate([
            { $group: { _id: null, total: { $sum: '$finalAmount' } } }
        ]);
        const totalDiscounts = await Order.aggregate([
            { $group: { _id: null, total: { $sum: '$discount' } } }
        ]);


        // Count orders
        const totalOrders = await Order.countDocuments();

        // Count products
        // const totalProducts = await Product.countDocuments(); // Assuming a `Product` model exists

        // Calculate monthly earnings
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const monthlyEarnings = await Order.aggregate([
            { $match: { createdAt: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: '$finalAmount' } } }
        ]);

        res.render('dashboard', {
            data: {
                revenue: totalRevenue[0]?.total || 0,
                orders: totalOrders,
                discount: totalDiscounts[0]?.total||0,
                monthlyEarning: monthlyEarnings[0]?.total || 0,
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
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


//Dashboard
const dashboard = async (req, res) => {

    // Aggregation Endpoint for Sales Data
        try {
            const { filter } = req.query; // Accept 'day', 'week', or 'month' as a query parameter
    
            let dateRange = {};
    
            if (filter === 'day') {
                dateRange = { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }; // Start of today
            } else if (filter === 'week') {
                const today = new Date();
                const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
                dateRange = { $gte: new Date(firstDayOfWeek.setHours(0, 0, 0, 0)) }; // Start of the week
            } else if (filter === 'month') {
                dateRange = { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }; // Start of the month
            }
    
            const productQuantities = await Order.aggregate([
                { $match: { createdAt: dateRange } }, // Filter by date range
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.productId',
                        totalQuantity: { $sum: '$items.quantity' },
                    },
                },
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'product',
                    },
                },
                { $unwind: '$product' },
                {
                    $project: {
                        _id: 0,
                        productName: '$product.name',
                        totalQuantity: 1,
                    },
                },
                { $sort: { totalQuantity: -1 } },
            ]);
            console.log(productQuantities)
            res.json({ success: true, data: productQuantities });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Server Error' });
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
    console.log('hiii in generate pdf')
    const { startDate, endDate, filterType, orders, totalSalesCount, totalOrderAmount, totalDiscounts } = req.body;

    // Validate required inputs
    if (!orders || !Array.isArray(orders)) {
        return res.status(400).json({ message: 'Invalid input data.' });
    }

    const doc = new PDFDocument({ margin: 30 });

    // Set response headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');

    // Pipe the document to the response
    doc.pipe(res);

    // Title and Date Range
    doc.fontSize(18)
        .text('Sales Report', { align: 'center' })
        .moveDown(0.5);

    doc.fontSize(12)
        .text(`Date Range: ${startDate} to ${endDate}`, { align: 'center' });

    if (filterType) {
        doc.text(`Filter Type: ${filterType}`, { align: 'center' });
    }
    doc.moveDown(1);

    // Summary Information in a box
    doc.rect(30, doc.y, doc.page.width - 60, 50)
        .stroke()
        .moveDown(0.2);

    doc.fontSize(12)
        .text(`Total Sales Count: ${totalSalesCount}`, 40, doc.y)
        .text(`Total Order Amount: ₹${totalOrderAmount}`, 40)
        .text(`Total Discounts: ₹${totalDiscounts}`, 40)
        .moveDown(1);

    // Create table header
    const tableTop = doc.y + 20;
    const columnWidths = {
        no: 40,
        orderId: 160,
        date: 90,
        total: 90,
        discount: 90,
        final: 90
    };

    // Draw table headers
    doc.font('Helvetica-Bold')
        .fontSize(10);

    let xPos = 30;
    doc.text('No.', xPos, tableTop);
    xPos += columnWidths.no;
    doc.text('Order ID', xPos, tableTop);
    xPos += columnWidths.orderId;
    doc.text('Order Date', xPos, tableTop);
    xPos += columnWidths.date;
    doc.text('Total Amount', xPos, tableTop);
    xPos += columnWidths.total;
    doc.text('Discount', xPos, tableTop);
    xPos += columnWidths.discount;
    doc.text('Final Amount', xPos, tableTop);

    // Draw table rows
    let yPos = tableTop + 20;
    doc.font('Helvetica')
        .fontSize(10);

    orders.forEach((order, index) => {
        // Check if we need a new page
        if (yPos > doc.page.height - 50) {
            doc.addPage();
            yPos = 50;
        }

        xPos = 30;
        doc.text(String(index + 1), xPos, yPos);
        xPos += columnWidths.no;
        doc.text(order.orderId, xPos, yPos);
        xPos += columnWidths.orderId;
        doc.text(new Date(order.date).toLocaleDateString(), xPos, yPos);
        xPos += columnWidths.date;
        doc.text(`₹${order.totalAmount.toFixed(2)}`, xPos, yPos);
        xPos += columnWidths.total;
        doc.text(`₹${order.discount.toFixed(2)}`, xPos, yPos);
        xPos += columnWidths.discount;
        doc.text(`₹${order.finalAmount.toFixed(2)}`, xPos, yPos);

        yPos += 20;
    });

    // Add footer with page numbers
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8)
            .text(
                `Page ${i + 1} of ${pages.count}`,
                0,
                doc.page.height - 50,
                { align: 'center' }
            );
    }

    // Finalize the PDF
    doc.end();
};

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
    dashboard
}
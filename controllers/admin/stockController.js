const Product = require('../../models/productSchema');


const loadStock =  async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = 6; 
        const skip = (page - 1) * limit; 

        
        const stockData = await Product.find({})
            .sort({ createdAt: -1 }) 
            .skip(skip)
            .limit(limit);

        const totalStock = await Product.countDocuments();

      
        const totalPages = Math.ceil(totalStock / limit);

      
        res.render('stockManagement', {
            products: stockData, 
            currentPage: page, 
            totalPages: totalPages, 
            totalStock: totalStock 
        });
    } catch (error) {
        console.error('Error fetching products for stock management:', error);
        res.status(500).send('Internal Server Error');
    }
};

const updateStock =  async (req, res) => {
    try {
        const { productId, stock } = req.body;
        await Product.findByIdAndUpdate(productId, { quantity:stock });
        res.status(200).json({ message: 'Stock updated successfully!' });
    } catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).json({ message: 'Error updating stock' });
    }
};


module.exports = {
    loadStock,
    updateStock
}
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');




const categoryInfo = async (req, res) => {
    try {

        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);
        res.render('category', {
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories
        });


    } catch (error) {
        console.error(error)
        res.redirect('/pageError')
    }
}

const addCategory = async (req, res) => {
    const { name, description } = req.body;
    try {
        const existingCategory = await Category.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
        if (existingCategory) {
            return res.status(400).json({ error: 'Category already exists' });
        }
        const newCategory = new Category({
            name,
            description
        })
        await newCategory.save();
        return res.json({ message: 'Category added successfully' });

    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const addCategoryOffer = async (req, res) => {
    try {
        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;
        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
            return res.status(400).json({ status: false, message: "Invalid percentage value" });
        }
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ status: false, message: 'Category not found' })
        }
        const products = await Product.find({ category: category._id });
        await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });
        for (const product of products) {
            product.categoryOffer = percentage;
            await product.save();
        }
        res.json({ status: true });

    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal Server Error' });

    }
}

const removeCategoryOffer = async (req, res) => {
    try {
        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({ status: false, message: 'Category not found' });

        }
        const products = await Product.find({ category: category._id });

        if (products.length > 0) {
            for (const product of products) {
                product.categoryOffer = 0;
                await product.save();
            }
        }
        category.categoryOffer = 0;
        await category.save();
        res.json({ status: true })
    } catch (error) {
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
}

const getListCategory = async (req, res) => {
    try {
        let { id, page } = req.query;
        await Category.updateOne({ _id: id }, { $set: { isListed: true } });
        res.redirect(`/admin/category?page=${page}`);
    } catch (error) {
        res.redirect('/pageError')
    }
}

const getUnlistCategory = async (req, res) => {
    try {
        let id = req.query.id;
        await Category.updateOne({ _id: id }, { $set: { isListed: false } });
        res.status(200).json('Success');
    } catch (error) {
        res.status(500).json({ redirect: '/pageError' })
    }
}

const getEditCategory = async (req, res) => {
    try {
        const id = req.query.id;
        const error = req.session?.editCategoryError;
        req.session.editCategoryError = null
        const category = await Category.findOne({ _id: id });
        res.render('edit-category', { category: category, error: error });
    } catch (error) {
        console.error(error)
        res.redirect('/pageError')
    }
}

const editCategory = async (req, res) => {
    try {
        const { categoryName, description, id } = req.body;
        const existingCategory = await Category.findOne({
            name: { $regex: `^${categoryName}$`, $options: 'i' },
            _id: { $ne: id }
        });

        if (existingCategory) {
            return res.status(400).json({ error: 'Category name already exists' });
        }
        const updateCategory = await Category.findByIdAndUpdate(id,
            { name: categoryName, description: description },
            { new: true }
        );

        if (updateCategory) {
            res.status(200).json({ redirect: '/admin/category' });
        } else {
            res.status(400).json({ error: 'Category not found' });
        }
    } catch (error) {
        console.error('Error updating category:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
}

const deleteCategory = async (req, res) => {
    const id = req.params.id;
    try {
        const category = await Category.findByIdAndUpdate({ _id: id }, { isDeleted: true }, { new: true });
        if (!category) {
            return res.status(404).json({ message: 'Category not Found' });
        }
        res.status(200).json({ message: `${category} deleted successfully` })
    } catch (error) {
        res.status(500).json({ message: 'Error occured during Deleting Category', error: error.message });
    }
}

module.exports = {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory,
    deleteCategory
}
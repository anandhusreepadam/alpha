const User = require('../../models/userSchema');
const { options } = require('../../routes/userRouter');


const customerInfo = async (req, res) => {
    try {
        const { page = 1, search = '', filter = 'all' } = req.query;
        console.log(req.query)
        const currentPage = parseInt(page, 10) || 1;
        const limit = 3;

        const query = {
            isAdmin: false,
            $or: [
                { name: { $regex: `.*${search}.*`, $options: 'i' } },
                { email: { $regex: `.*${search}.*`, $options: 'i' } },
            ],
        };

        if (filter === 'active') {
            query.isBlocked = false;
        } else if (filter === 'blocked') {
            query.isBlocked = true;
        }
        const userData = await User.find(query)
            .limit(limit)
            .skip((currentPage - 1) * limit)
            .exec();

        const count = await User.countDocuments(query);

        res.render('customers', {
            data: userData,
            totalPages: Math.ceil(count / limit),
            currentPage,
            search,
            filter,
        });
    } catch (error) {
        console.error('Error fetching customer information:', error);
        res.redirect('/pageError');
    }
};


const customerBlocked = async (req, res) => {
    try {
        let { id, page } = req.query;
        await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.redirect(`/admin/users?page=${page}`)
    } catch (error) {
        res.redirect('/pageError')
    }
};

const customerUnblocked = async (req, res) => {
    try {
        let { id, page } = req.query;
        await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.redirect(`/admin/users?page=${page}`)
    } catch (error) {
        res.redirect('/pageError')
    }
};

module.exports = {
    customerInfo,
    customerBlocked,
    customerUnblocked
}
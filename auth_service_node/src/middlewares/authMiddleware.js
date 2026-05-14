const jwt = require('jsonwebtoken');
const supabase = require('../config/supabaseClient');

/**
 * Protect routes - Check if user is logged in
 */
const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ error: 'UNAUTHORIZED', message: 'No token provided' });
        }

        // Verify JWT signature
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'sufi_secret_123');

        // Customer accounts live in Supabase (used by Google OAuth strategy).
        // Prefer lookup by email because ids may be non-Mongo (uuid/int).
        const email = decoded?.email;
        const id = decoded?.id;

        let customerQuery = supabase.from('customers').select('*').limit(1);
        if (email) customerQuery = customerQuery.eq('email', email);
        else if (id !== undefined && id !== null) customerQuery = customerQuery.eq('id', id);
        else return res.status(401).json({ error: 'INVALID_OR_EXPIRED_TOKEN' });

        const { data: customers, error } = await customerQuery;
        if (error) {
            return res.status(401).json({ error: 'INVALID_OR_EXPIRED_TOKEN' });
        }

        const customer = customers && customers.length > 0 ? customers[0] : null;
        if (!customer || customer.is_active === false) {
            return res.status(401).json({ error: 'USER_NOT_FOUND_OR_INACTIVE' });
        }

        req.user = customer;
        return next();
    } catch (err) {
        return res.status(401).json({ error: 'INVALID_OR_EXPIRED_TOKEN' });
    }
};

module.exports = { protect };

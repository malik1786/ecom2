const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    
    res.status(err.statusCode || 500).json({
        success: false,
        error: err.code || 'INTERNAL_SERVER_ERROR',
        message: err.message || 'Server Error',
        data: null,
        debug: {
            db_saved: false,
            payment_processed: false,
            errors: [err.message || 'Server Error']
        }
    });
};

module.exports = errorHandler;

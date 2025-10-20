import jwt from 'jsonwebtoken';

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        // Create an error object to pass to the middleware's callback
        const err = new Error('Access token required');
        err.status = 401;
        return next(err);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error("JWT_SECRET is not set on the server.");
        const err = new Error('Server configuration error: JWT secret is missing.');
        err.status = 500;
        return next(err);
    }

    jwt.verify(token, secret, (err, user) => {
        if (err) {
            console.error("JWT Verification Error:", err.message);
            const verificationError = new Error('Invalid or expired token');
            verificationError.status = 403;
            return next(verificationError);
        }
        req.user = user; // Add decoded user payload to request object
        next();
    });
};

export default authenticateToken;


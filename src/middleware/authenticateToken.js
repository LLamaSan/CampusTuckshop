import jwt from 'jsonwebtoken';

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        const err = new Error('Access token required');
        err.status = 401;
        return next(err); // Pass error to Vercel's middleware runner
    }
    
    const secret = process.env.JWT_SECRET;

    // --- TEMPORARY DEBUG LOGGING ---
    console.log('--- TOKEN VERIFICATION (Protected Route) ---');
    console.log(`JWT_SECRET found for VERIFYING: "${secret}"`);
    console.log(`Secret length: ${secret ? secret.length : 'NOT SET'}`);
    console.log('------------------------------------------');
    // --- END DEBUG ---

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




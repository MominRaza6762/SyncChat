import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
    windowMs: 30 * 60 * 1000, 
    max: 5,
    keyGenerator: (req) => req.body.email, 
    handler: (req, res) => {
        const retryAfter = req.rateLimit.resetTime
            ? Math.ceil((req.rateLimit.resetTime - Date.now()) / 60000)
            : 30; 
        
        res.status(429).json({
            message: `Too many login attempts. Please wait ${retryAfter} minutes before trying again.`,
        });
    },
    headers: true,
});

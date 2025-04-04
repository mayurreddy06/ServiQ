// this is to avoid spam of CRUD calls
const rateLimiter = require('express-rate-limit');
const limiter = rateLimiter({
        windowMs: 60 * 1000,
        max: 100, 
        message: "ERROR: user has exceeded the the rate limit for volunteer data CRUD requests",
    });
module.exports = limiter;
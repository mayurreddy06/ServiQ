const express = require('express');
const userAuthorized = express.Router();

// ensures user is logged out in order to prevent them from accessing any user authentication routes
userAuthorized.use((req, res, next) => {
    if (req.session.user?.uid && req.session.user.isVerified === true && req.path !== "/status" && req.path !== "/logout")
    {
        return res.status(401).json({error: "User already logged in"});
    }
    next();
})

module.exports = userAuthorized;

const express = require('express');
const userAuthorized = express.Router();

// checks if user is logged in in order to perform POST, PUT, DELETE to firebase volunteering data
userAuthorized.use(async (req, res, next) => {
  // returns so that fetchAndDisplayMarkers() can be used on the home page
  if (req.method === "GET" && req.path === "/")
  {
    return next();
  }
  else if (!req.session.user?.uid)
  {
    return res.status(401).json("User not logged in");
  }
  next();

});
module.exports = userAuthorized;
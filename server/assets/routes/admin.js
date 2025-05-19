// file for viewing admin-only pages when logged in
const express = require('express');
const admin = express.Router();

admin.get('/post',(req, res) => {
    res.render("taskpost.ejs");
});
admin.get('/post/:timestamp',(req, res) => {
    res.render("taskpost.ejs");
});
admin.get('/view', (req, res) => {
    res.render('viewPosts.ejs');
});

admin.get('/view/:timestamp', (req, res) => {
    res.render('viewPosts.ejs');
})

admin.get("/edit/:timestamp", (req, res) => {
    res.render("editTask.ejs");
});

module.exports = admin;
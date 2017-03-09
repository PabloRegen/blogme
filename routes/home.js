'use strict';

const router = require('express-promise-router')();

// home
router.get('/', (req, res) => {
	res.render('home/home', {title: 'home', message: 'get - home'});
});

// about
router.get('/about', (req, res) => {
	res.render('home/about', {title: 'about', message: 'get - about'});
});

// contact
router.get('/contact', (req, res) => {
	res.render('home/contact', {title: 'contact', message: 'get - contact'});
});

module.exports = router;
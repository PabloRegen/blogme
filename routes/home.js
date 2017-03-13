'use strict';

const router = require('express-promise-router')();

router.get('/', (req, res) => {
	res.render('home/home', {title: 'home'});
});

router.get('/about', (req, res) => {
	res.render('home/about', {title: 'about'});
});

router.get('/contact', (req, res) => {
	res.render('home/contact', {title: 'contact'});
});

module.exports = router;
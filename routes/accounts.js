'use strict';

// const Promise = require('bluebird');
const router = require('express-promise-router')();

// signup
router.get('/signup', function(req, res) {
	res.send('get - signup');
});

router.post('/signup', function(req, res) {
	res.send('post - signup');
});

// signin
router.get('/signin', function(req, res) {
	res.send('get - signin');
});

router.post('/signin', function(req, res) {
	res.send('post - signin');
});

// signout
router.get('/signout', function(req, res) {
	res.send('get - signout');
});

router.post('/signout', function(req, res) {
	res.send('post - signout');
});

// delete
router.get('/delete', function(req, res) {
	res.send('get - delete');
});

router.post('/delete', function(req, res) {
	res.send('post - delete');
});

// profile
router.get('/profile', function(req, res) {
	res.send('get - profile');
});

router.post('/profile', function(req, res) {
	res.send('post - profile');
});

module.exports = router;
'use strict';

const Promise = require('bluebird');
const router = require('express-promise-router')();
const checkit = require('checkit');
const scryptForHumans = require('scrypt-for-humans');
const rfr = require('rfr');
const errors = rfr('lib/errors');

/* signup */
router.get('/signup', function(req, res) {
	res.send('get - signup');
});

router.post('/signup', function(req, res) {
	res.send('post - signup');
});

/* signin */
router.get('/signin', function(req, res) {
	res.send('get - signin');
});

router.post('/signin', function(req, res) {
	return Promise.try(() => {
		return checkit({
			usernameOrEmail: 'required',
			password: 'required'
		}).run(req.body);
	}).then(() => {
		return knex('users').where({username: req.body.usernameOrEmail}).orWhere({email: req.body.usernameOrEmail});
	}).then((users) => {
		if (users.length === 0) {
			throw new errors.UnauthorizedError('Invalid username or email');
		} else {
			let user = users[0];

			return Promise.try(() => {
				return scryptForHumans.verifyHash(req.body.password, user.pwHash);
			}).then(() => {
				/* start a session with user id as the session's only data */
				req.session.userId = user.id;
				res.send('post - signin');
			});
		}
	}).catch(checkit.Error, (err) => {
		throw new errors.ValidationError('Must enter both fields', {errors: err.errors});
	}).catch(scryptForHumans.PasswordError, (err) => {
		throw new errors.UnauthorizedError('Invalid password');
	});
});

/* signout */
router.get('/signout', function(req, res) {
	res.send('get - signout');
});

router.post('/signout', function(req, res) {
	res.send('post - signout');
});

/* delete */
router.get('/delete', function(req, res) {
	res.send('get - delete');
});

router.post('/delete', function(req, res) {
	res.send('post - delete');
});

/* profile */
router.get('/profile', function(req, res) {
	res.send('get - profile');
});

router.post('/profile', function(req, res) {
	res.send('post - profile');
});

module.exports = router;
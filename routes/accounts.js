'use strict';

const Promise = require('bluebird');
const expressPromiseRouter = require('express-promise-router');
const checkit = require('checkit');
const scryptForHumans = require('scrypt-for-humans');
const rfr = require('rfr');

const errors = rfr('lib/errors');
const requireSignin = rfr('middleware/require-signin');

module.exports = function(knex, environment) {
	let router = expressPromiseRouter();
	
	/* signup */
	router.get('/signup', function(req, res) {
		res.render('accounts/signup');
	});

	router.post('/signup', function(req, res) {
		if (environment === 'development') {
			console.log('signup req.body:');
			console.log(req.body);
		}
		
		return Promise.try(() => {
			return checkit({
				username: 'required',
				email: ['required', 'email'],
				password: 'required',			// add min length, simbols, etc
				'confirm_password': ['required', 'matchesField:password']
			}).run(req.body);
		}).then(() => {
			return knex('users').where({username: req.body.username});
		}).then((users) => {
			if (users.length > 0) {
				throw new Error('Username already in use. Choose a different one');
			}
		}).then(() => {
			return knex('users').where({email: req.body.email});
		}).then((users) => {
			if (users.length > 0) {
				throw new Error('Email already in use. Choose a different one');
			} else {
				return knex('users').insert({
					username: req.body.username,
					email: req.body.email,
					pwHash: scryptForHumans.hash(req.body.password)
				});
			}
		}).then(() => {
			res.redirect('accounts/dashboard');
		}).catch(checkit.Error, (err) => {
			// FIXME! Need to separate errors depending on the checkit error type: required, email, matches
			if (err.errors.email.message === 'The email must be a valid email address') {
				throw new Error(err.errors.email.message);
			} else if (err.errors.confirm_password.message === 'The confirm_password must exactly match the password'){
				throw new Error(err.errors.confirm_password.message);
			} else {
				throw new errors.ValidationError('Must fill all fields', {errors: err.errors});
			}
		});
	});

	/* signin */
	router.get('/signin', function(req, res) {
		res.render('accounts/signin');
	});

	router.post('/signin', function(req, res) {
		if (environment === 'development') {
			console.log('signin req.body:');
			console.log(req.body);
		}

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
					/* Start a session with user id as the session's only data */
					/* Or if user is already logged in change the user id in the session */
					/* with the practical result of logging the user out and logging him back in as another user */
					req.session.userId = user.id;
					res.redirect('accounts/dashboard');
				});
			}
		}).catch(checkit.Error, (err) => {
			throw new errors.ValidationError('Must enter both fields', {errors: err.errors});
		}).catch(scryptForHumans.PasswordError, (err) => {
			throw new errors.UnauthorizedError('Invalid password');
		});
	});

	/* signout */
	router.get('/signout', requireSignin, function(req, res) {
		res.send('get - signout');
	});

	router.post('/signout', function(req, res) {
		res.send('post - signout');
	});

	/* delete */
	router.get('/delete', requireSignin, function(req, res) {
		res.send('get - delete');
	});

	router.post('/delete', function(req, res) {
		res.send('post - delete');
	});

	/* profile */
	router.get('/profile', requireSignin, function(req, res) {
		res.send('get - profile');
	});

	router.post('/profile', function(req, res) {
		res.send('post - profile');
	});

	/* dashboard */
	router.get('/dashboard', requireSignin, function(req, res) {
		res.send('get - dashboard');
	});

	return router;
};
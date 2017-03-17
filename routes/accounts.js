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
				password: ['required', 'minLength:8', 'maxLength:1024'],
				confirm_password: ['required', 'matchesField:password']
			}).run(req.body);
		}).then(() => {
			return knex('users').where({username: req.body.username});
		}).then((users) => { 
			if (users.length > 0) {
				throw new Error('The username is taken. Choose another one');
			}

			return knex('users').where({email: req.body.email});
		}).then((users) => {
			if (users.length > 0) {
				throw new Error('The email address is already in use');
			} else {
				return scryptForHumans.hash(req.body.password);
			}
		}).then((hash) => {
			return knex('users').insert({
				username: req.body.username,
				email: req.body.email,
				pwHash: hash
			});
		}).then(() => {
			// FIXME! Need to be updated to send a confirmation email instead
			res.redirect('accounts/dashboard');
		}).catch(checkit.Error, (err) => {
			console.log(err);
			console.log('---');
			// FIXME! Need to separate errors depending on the checkit error type: required, email, matches
			if (err.errors.email.message != null && err.errors.email.message === 'The email must be a valid email address') {
				// if (err.errors.email.message === 'The email must be a valid email address') {
					throw new Error(err.errors.email.message);
				// }
			} else if (err.errors.password.message != null) {
				if (err.errors.password.message !== 'The password is required') {
					throw new Error(err.errors.password.message);
				}
			} else if (err.errors.confirm_password.message != null) {
				if (err.errors.confirm_password.message === 'The confirm_password must exactly match the password') {
					throw new Error('The password and confirm password must exactly match');
				}
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
		req.session.destroy();
		res.redirect('/');
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
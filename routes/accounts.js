'use strict';

const Promise = require('bluebird');
const expressPromiseRouter = require('express-promise-router');
const checkit = require('checkit');
const scryptForHumans = require('scrypt-for-humans');
const rfr = require('rfr');
const databaseError = require('database-error');

const errors = rfr('lib/errors');
const requireSignin = rfr('middleware/require-signin');

let duplicateUsername = {
	name: 'UniqueConstraintViolationError',
	table: 'users',
	column: 'username'
};

let duplicateEmailAddress = {
	name: 'UniqueConstraintViolationError',
	table: 'users',
	column: 'email'
};

module.exports = function(knex, environment) {
	let router = expressPromiseRouter();
	
	/* signup */
	router.get('/signup', (req, res) => {
		// FIXME! temporary passing errors as an empty object
		res.render('accounts/signup', {errors: {}});
	});

	router.post('/signup', (req, res) => {
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
				return scryptForHumans.hash(req.body.password);
		}).then((hash) => {
			return knex('users').insert({
				username: req.body.username,
				email: req.body.email,
				pwHash: hash
			});
		}).then(() => {
			// FIXME! Send a confirmation email instead
			res.redirect('/accounts/dashboard');
		}).catch(databaseError.rethrow).catch(duplicateUsername, (err) => {
			if (environment === 'development') {
				console.log('databaseError - duplicateUsername');
				console.log(err);
			}

			let errors = {
				username: { 
					message: 'That username already exists! Please pick a different one.' 
				}
			};
			
			res.render('accounts/signup', {errors: errors});
		}).catch(duplicateEmailAddress, (err) => {
			if (environment === 'development') {
				console.log('databaseError - duplicateEmailAddress');
				console.log(err);
			}
			
			let errors = {
				email: { 
					message: 'That e-mail address already exists! Please pick a different one.' 
				}
			};			

			res.render('accounts/signup', {errors: errors});
		}).catch(checkit.Error, (err) => {
			if (environment === 'development') {
				console.log('checkitError');
				console.log(err);
			}

			res.render('accounts/signup', {errors: err.errors});
		});
	});

	/* signin */
	router.get('/signin', (req, res) => {
		res.render('accounts/signin');
	});

	router.post('/signin', (req, res) => {
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
					res.redirect('/accounts/dashboard');
				});
			}
		}).catch(checkit.Error, (err) => {
			throw new errors.ValidationError('Must enter both fields', {errors: err.errors});
		}).catch(scryptForHumans.PasswordError, (err) => {
			throw new errors.UnauthorizedError('Invalid password');
		});
	});

	/* signout */
	router.get('/signout', requireSignin, (req, res) => {
		req.session.destroy();
		res.redirect('/');
	});

	/* delete */
	router.post('/delete', requireSignin, (req, res) => {
		res.send('post - delete');
	});

	router.post('/delete', (req, res) => {
		res.send('post - delete');
	});

	/* profile */
	router.get('/profile', requireSignin, (req, res) => {
		res.send('get - profile');
	});

	router.post('/profile', (req, res) => {
		res.send('post - profile');
	});

	/* dashboard */
	router.get('/dashboard', requireSignin, (req, res) => {
		res.render('accounts/dashboard');
	});

	return router;
};
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

let logReqBody = function(environment, reqBody, whichReqBody) {
	if (environment === 'development') {
		console.log(whichReqBody);
		console.log(reqBody);
	}
};

let logError = function(environment, err, errorType) {
	if (environment === 'development') {
		console.log('error type is: ', errorType);
		console.log('error is:');
		console.log(err);
	}
};

module.exports = function(knex, environment) {
	let router = expressPromiseRouter();
	
	/* signup */
	router.get('/signup', (req, res) => {
		res.render('accounts/signup');
	});

	router.post('/signup', (req, res) => {
		logReqBody(environment, req.body, 'signup post! req.body:')
		
		return Promise.try(() => {
			return checkit({
				username: 'required',
				email: ['required', 'email'],
				password: ['required', 'minLength:8', 'maxLength:1024'],
				confirm_password: [{
						rule: 'required',
						message: 'The confirmation is required'
					}, {
						rule: 'matchesField:password',
						message: 'The confirmation must exactly match the password'
					}]
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
			res.redirect('/accounts/signin');
		}).catch(databaseError.rethrow).catch(duplicateUsername, (err) => {
			logError(environment, err, 'databaseError - duplicateUsername');

			let errors = {
				username: { 
					message: 'That username already exists! Please pick a different one.' 
				}
			};
			
			res.render('accounts/signup', {errors: errors});
		}).catch(duplicateEmailAddress, (err) => {
			logError(environment, err, 'databaseError - duplicateEmailAddress');
			
			let errors = {
				email: { 
					message: 'That e-mail address already exists! Please pick a different one.' 
				}
			};			

			res.render('accounts/signup', {errors: errors});
		}).catch(checkit.Error, (err) => {
			logError(environment, err, 'checkitError');

			res.render('accounts/signup', {errors: err.errors});
		});
	});

	/* signin */
	router.get('/signin', (req, res) => {
		console.log('signin.get route!');
		console.log('-----');

		res.render('accounts/signin');
	});

	router.post('/signin', (req, res) => {
		logReqBody(environment, req.body, 'signin post! req.body:')

		return Promise.try(() => {
			return checkit({
				usernameOrEmail: 'required',
				password: 'required'
			}).run(req.body);
		}).then(() => {
			return knex('users').where({username: req.body.usernameOrEmail}).orWhere({email: req.body.usernameOrEmail});
		}).then((users) => {
			if (users.length === 0) {
				logError(environment, 'Invalid username or email', 'User Error');

				let errors = {
					usernameOrEmail: {
						message: 'Invalid username or email'
					}
				};

				res.render('accounts/signin', {errors: errors});
				// throw new errors.UnauthorizedError('Invalid username or email');
			} else {
				let user = users[0];

				return Promise.try(() => {
					return scryptForHumans.verifyHash(req.body.password, user.pwHash);
				}).then(() => {
					/* Start a session with user id as the session's only data */
					/* Or if user is already logged in change the user id in the session */
					/* with the practical result of logging the user out and logging him back in as another user */
					req.session.userId = user.id;

					return req.saveSession();
				}).then(() => {
					console.log('redirecting from signin post! to dashboard route!');

					res.redirect('/accounts/dashboard');
				});
			}
		}).catch(checkit.Error, (err) => {
			logError(environment, err, 'checkitError');

			res.render('accounts/signin', {errors: err.errors});
			// throw new errors.ValidationError('Must enter both fields', {errors: err.errors});
		}).catch(scryptForHumans.PasswordError, (err) => {
			logError(environment, err, 'scryptForHumans error');

			let errors = {
				password: {
					message: 'Invalid password'
				}
			};

			res.render('accounts/signin', {errors: errors});
			// throw new errors.UnauthorizedError('Invalid password');
		});
	});

	/* signout */
	router.get('/signout', requireSignin, (req, res) => {
		logReqBody(environment, req.body, 'signout get! req.body:');

		req.session.destroy();
		res.redirect('/');
	});

	/* delete */
	router.post('/delete', requireSignin, (req, res) => {
		logReqBody(environment, req.body, 'delete post! req.body:');

		return Promise.try(() => {
			return knex('users').where({id: req.currentUser.id}).update({
				deletedAt: knex.fn.now()
			});
		}).then(() => {
			req.session.destroy();
			res.redirect('/');
		});
	});

	/* profile */
	router.get('/profile', requireSignin, (req, res) => {
		logReqBody(environment, req.body, 'profile get! req.body:');

		res.render('accounts/profile');
	});

	router.post('/profile', requireSignin, (req, res) => {
		logReqBody(environment, req.body, 'profile post! req.body:');

		return Promise.try(() => {
			return knex('users').where({id: req.currentUser.id}).insert({
				name: req.body.name,
				bio: req.body.bio
			});
		}).then(() => {
			res.render('accounts/dashboard');
		});
	});

	/* dashboard */
	router.get('/dashboard', requireSignin, (req, res) => {
		logReqBody(environment, req.body, 'dashboard! req.body:');

		return Promise.try(() => {
			return knex('posts').where({userId: req.currentUser.id}).limit(3).orderBy('id', 'desc');
		}).then((posts) => {
			res.render('accounts/dashboard', {latestPosts: posts});
		});
	});

	return router;
};
'use strict';

const Promise = require('bluebird');
const expressPromiseRouter = require('express-promise-router');
const checkit = require('checkit');
const multer = require('multer');
const uuidV4 = require('uuid/v4');
const path = require('path');
const rfr = require('rfr');
const scryptForHumans = require('scrypt-for-humans');
const databaseError = require('database-error');

const requireSignin = rfr('middleware/require-signin');
const errors = rfr('lib/errors');

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

let logReqFile = function(environment, reqFile, whichReqFile) {
	if (environment === 'development') {
		console.log(whichReqFile);
		console.log(reqFile);
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

	let storage = multer.diskStorage({
		destination: path.join(__dirname, '../uploads/usersPics'),
		filename: (req, file, cb) => {
			cb(null, `${uuidV4()}-${file.originalname}`);
		}
	});

	let storeUpload = Promise.promisify(multer({storage: storage}).single('userPic'));
	
	/* signup */
	router.get('/signup', (req, res) => {
		res.render('accounts/signup');
	});

	router.post('/signup', (req, res) => {
		logReqBody(environment, req.body, 'signup POST! req.body:')
		
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
			}).returning('id');
		}).then((userID) => {
			// FIXME! Send a confirmation email instead?
			return req.loginUser(userID[0]);

			// req.session.userId = userID[0];
			// return req.saveSession();

		}).then(() => {
			res.redirect('/accounts/dashboard');
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
		console.log('signin GET route');
		console.log('-----');

		res.render('accounts/signin');
	});

	router.post('/signin', (req, res) => {
		logReqBody(environment, req.body, 'signin POST! req.body:')

		return Promise.try(() => {
			return checkit({
				usernameOrEmail: 'required',
				password: 'required'
			}).run(req.body);
		}).then(() => {
			return knex('users').where(function() {
				this.where({username: req.body.usernameOrEmail}).orWhere({email: req.body.usernameOrEmail})
			}).andWhere({deletedAt: null});
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
					return req.loginUser(user.id);

					// req.session.userId = user.id;
					// return req.saveSession();

				}).then(() => {
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
	router.get('/signout', requireSignin(environment), (req, res) => {
		logReqBody(environment, req.body, 'signout GET! req.body:');

		return Promise.try(() => {
			return req.destroySession();
		}).then(() => {
			res.redirect('/');
		});
	});

	/* delete */
	router.post('/delete', requireSignin(environment), (req, res) => {
		logReqBody(environment, req.body, 'delete POST! req.body:');

		return Promise.try(() => {
			return knex('users').where({id: req.currentUser.id}).update({
				deletedAt: knex.fn.now()
			});
		}).then(() => {
			return req.destroySession();
		}).then(() => {
			res.redirect('/');
		});
	});

	/* profile */
	router.get('/profile', requireSignin(environment), (req, res) => {
		logReqBody(environment, req.body, 'profile GET! req.body:');

		res.render('accounts/profile');
	});

	router.post('/profile', requireSignin(environment), (req, res) => {
		return Promise.try(() => {
			return storeUpload(req, res);
		}).then(() => {	
			logReqBody(environment, req.body, 'profile POST! req.body:');
			logReqFile(environment, req.file, 'profile POST! req.file:');

			return knex('users').where({id: req.currentUser.id}).update({
				name: req.body.name,
				bio: req.body.bio,
				pic: (req.file != null ? req.file.filename : undefined)
			});
		}).then(() => {
			res.redirect('/accounts/dashboard');
		});
	});

	/* dashboard */
	router.get('/dashboard', requireSignin(environment), (req, res) => {
		logReqBody(environment, req.body, 'dashboard GET! req.body:');

		return Promise.try(() => {
			return knex('posts').where({userId: req.currentUser.id}).limit(3).orderBy('id', 'desc');
		}).then((posts) => {
			res.render('accounts/dashboard', {latestPosts: posts});
		});
	});

	return router;
};
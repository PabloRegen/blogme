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
const logReqBody = rfr('lib/log-req-body');
const logReqFile = rfr('lib/log-req-file');
const logError = rfr('lib/log-error');

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

	let storage = multer.diskStorage({
		destination: path.join(__dirname, '../uploads'),
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
		logReqBody(environment, 'POST/signup req.body:', req.body)
		
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
		}).then((userIDs) => {
			// FIXME! Send a confirmation email instead?
			return req.loginUser(userIDs[0]);
		}).then(() => {
			res.redirect('/accounts/dashboard');
		}).catch(databaseError.rethrow).catch(duplicateUsername, (err) => {
			logError(environment, 'databaseError - duplicateUsername', err);

			let errors = {
				username: { 
					message: 'That username already exists! Please pick a different one.' 
				}
			};
			
			res.render('accounts/signup', {errors: errors});
		}).catch(duplicateEmailAddress, (err) => {
			logError(environment, 'databaseError - duplicateEmailAddress', err);
			
			let errors = {
				email: { 
					message: 'That e-mail address already exists! Please pick a different one.' 
				}
			};			

			res.render('accounts/signup', {errors: errors});
		}).catch(checkit.Error, (err) => {
			logError(environment, 'checkitError', err);

			res.render('accounts/signup', {errors: err.errors});
		});
	});

	/* signin */
	router.get('/signin', (req, res) => {
		res.render('accounts/signin');
	});

	router.post('/signin', (req, res) => {
		logReqBody(environment, 'POST/signin req.body:', req.body);

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
				logError(environment, 'User Error', 'Invalid username or email');

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
				}).then(() => {
					res.redirect('/accounts/dashboard');
				});
			}
		}).catch(checkit.Error, (err) => {
			logError(environment, 'checkitError', err);

			res.render('accounts/signin', {errors: err.errors});
			// throw new errors.ValidationError('Must enter both fields', {errors: err.errors});
		}).catch(scryptForHumans.PasswordError, (err) => {
			logError(environment, 'scryptForHumans error', err);

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
		return Promise.try(() => {
			return req.destroySession();
		}).then(() => {
			res.redirect('/');
		});
	});

	/* delete */
	router.post('/delete', requireSignin(environment), (req, res) => {
		return Promise.try(() => {
			return knex('users').where({id: req.currentUser.id}).update({deletedAt: knex.fn.now()});
		}).then(() => {
			return req.destroySession();
		}).then(() => {
			res.redirect('/');
		});
	});

	/* profile */
	router.get('/profile', requireSignin(environment), (req, res) => {
		res.render('accounts/profile');
	});

	router.post('/profile', requireSignin(environment), (req, res) => {
		return Promise.try(() => {
			return storeUpload(req, res);
		}).then(() => {	
			logReqBody(environment, 'POST/profile req.body:', req.body);
			logReqFile(environment, 'POST/profile req.file:', req.file);

			let name = req.body.name.trim();
			let bio = req.body.bio.trim();

			return knex('users').where({id: req.currentUser.id}).update({
				name: name !== '' ? name : null,
				bio: bio !== '' ? bio : null,
				pic: req.file != null ? req.file.filename : undefined
			});
		}).then(() => {
			res.redirect('/accounts/dashboard');
		});
	});

	/* dashboard */
	router.get('/dashboard', requireSignin(environment), (req, res) => {
		return Promise.try(() => {
			return knex('posts').where({userId: req.currentUser.id}).limit(3).orderBy('id', 'desc');
		}).then((posts) => {
			res.render('accounts/dashboard', {latestPosts: posts});
		});
	});

	return router;
};
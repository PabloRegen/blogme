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
const nullIfEmptyString = rfr('lib/null-if-empty-string');

const auth = rfr('middleware/auth');

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

let duplicateFollow = {
	name: 'UniqueConstraintViolationError',
	table: 'followingusers',
	columns: ['userId', 'followedUserId']
};

let followingSelf = {
	name: 'CheckConstraintViolationError',
	table: 'followingusers',
	constraint: 'check_not_following_self'
};

let adminsOnlyAuth = function(requiredRole) {
	return function(req, res, next) {
		if (req.currentUser.role >= requiredRole) {
			next();
		} else {
			throw new errors.UnauthorizedError('You do not have the required permissions to access this page');
		}
	};
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

	let userQuery = function(id) {
		return knex('users').where({id: id}).first();
	};
	
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
			/* Start a session by assigning the new user id to req.session.userId & saving the session */
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
			let usernameOrEmail = req.body.usernameOrEmail;

			return knex('users').where(function() {
				this.where({username: usernameOrEmail}).orWhere({email: usernameOrEmail})
			}).andWhere({deletedAt: null}).first();
		}).then((user) => {
			if (user == null) {
				logError(environment, 'User Error', 'Invalid username or email');

				let errors = {
					usernameOrEmail: {
						message: 'Invalid username or email'
					}
				};

				res.render('accounts/signin', {errors: errors});
				// throw new errors.UnauthorizedError('Invalid username or email');
			} else {
				return Promise.try(() => {
					return scryptForHumans.verifyHash(req.body.password, user.pwHash);
				}).then(() => {
					/* Start a session by assigning the existing user id to req.session.userId & saving the session */
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

	/* password update by admin */
	router.get('/users/change-password/admin', adminsOnlyAuth(2), (req, res) => {
		res.render('accounts/change-password-admin');
	});

	router.post('/users/change-password/admin', adminsOnlyAuth(2), (req, res) => {
		logReqBody(environment, 'POST/users/change-password/admin req.body:', req.body);

		return Promise.try(() => {
			return checkit({
				username: 'required',
				email: ['required', 'email'],
				password: ['required', 'minLength:8', 'maxLength:1024']
			}).run(req.body);
		}).then(() => {
			return knex('users').where({
				username: req.body.username,
				email: req.body.email
			}).first();
		}).then((user) => {
			if (user == null) {
				logError(environment, 'User Error', 'Invalid username or email');

				let errors = {
					username: { message: 'Invalid username or email' },
					email: { message: 'Invalid username or email' }
				};

				res.render('accounts/change-password-admin', {errors: errors});
				// throw new errors.UnauthorizedError('Invalid username or email');
			} else {
				return Promise.try(() => {
					return scryptForHumans.hash(req.body.password);
				}).then((hash) => {
					return knex('users').update({pwHash: hash}).where({
						username: req.body.username,
						email: req.body.email //FIXME!!! needed if I already look for username which is unique???
					});
				}).then(() => {
					res.redirect('/accounts/dashboard');
				});
			}
		}).catch(checkit.Error, (err) => {
			logError(environment, 'checkitError', err);

			res.render('accounts/change-password-admin', {errors: err.errors});
			// throw new errors.ValidationError('Must enter both fields', {errors: err.errors});
		});
	});

	/* signout */
	router.post('/signout', requireSignin, (req, res) => {
		return Promise.try(() => {
			return req.destroySession();
		}).then(() => {
			res.redirect('/');
		});
	});

	/* delete */
	router.post('/delete', requireSignin, (req, res) => {
		return Promise.try(() => {
			return userQuery(req.currentUser.id).update({deletedAt: knex.fn.now()});
		}).then(() => {
			return req.destroySession();
		}).then(() => {
			res.redirect('/');
		});
	});

	/* profile */
	router.get('/profile', requireSignin, (req, res) => {
		res.render('accounts/profile');
	});

	router.post('/profile', requireSignin, (req, res) => {
		return Promise.try(() => {
			return userQuery(req.currentUser.id).update({pic: null});
		}).then(() => {
			res.redirect('/accounts/profile');
		});
	});

	/* edit profile */
	router.get('/profile/edit', requireSignin, (req, res) => {
		res.render('accounts/profile-edit');
	});

	router.post('/profile/edit', requireSignin, (req, res) => {
		return Promise.try(() => {
			return storeUpload(req, res);
		}).then(() => {	
			logReqBody(environment, 'POST/profile/edit req.body:', req.body);
			logReqFile(environment, 'POST/profile/edit req.file:', req.file);

			return userQuery(req.currentUser.id).update({
				name: nullIfEmptyString(req.body.name),
				bio: nullIfEmptyString(req.body.bio),
				pic: (req.file != null ? req.file.filename : undefined)
			});
		}).then(() => {
			res.redirect('/accounts/profile');
		});
	});

	/* dashboard */
	router.get('/dashboard', requireSignin, (req, res) => {
		return Promise.all([
			Promise.try(() => {
				return knex('posts').where({
					userId: req.currentUser.id,
					deletedAt: null,
					isVisible: true
				}).limit(3).orderBy('id', 'desc');
			}).map((post) => {
				return Promise.try(() => {
					return knex('slugs').where({
						postId: post.id,
						isCurrent: true
					}).first();
				}).then((slug) => {
					if (slug != null) {
						return Object.assign({slug: slug.name}, post);
					} else {
						throw new Error('The slug is missing');
					}
				});
			}),
			knex('likedposts').where({postOwnerId: req.currentUser.id}).count(),
			knex('likedposts').where({userId: req.currentUser.id}).count(),
			knex('followingusers').where({followedUserId: req.currentUser.id}).count(),
			knex('followingusers').where({userId: req.currentUser.id}).count()
		]).spread((postsWithSlugs, likes, liking, follows, following) => {
			res.render('accounts/dashboard', {
				latestPosts: postsWithSlugs,
				likes: parseInt(likes[0].count),
				liking: parseInt(liking[0].count),
				follows: parseInt(follows[0].count),
				following: parseInt(following[0].count)
			});
		});
	});

	/* follow user */
	router.post('/:followedUserId/follow', requireSignin, (req, res) => {
		return Promise.try(() => {
			return knex('followingusers').insert({
				userId: req.currentUser.id,
				followedUserId: parseInt(req.params.followedUserId)
			});
		}).catch(databaseError.rethrow).catch(followingSelf, (err) => {
		}).catch(duplicateFollow, (err) => {
			/* Intentionally do nothing on these 2 .catch() because both, the .catch() and the .then() redirect to the same URL */
			/* The error is handled, .catch() returns a promise, and the next .then() will be executed */
		}).then(() => {
			res.redirect(`/posts/${req.query.redirectToPost}`);
		});
	});

	/* unfollow user */
	router.post('/:followedUserId/unfollow', requireSignin, (req, res) => {
		return Promise.try(() => {
			return knex('followingusers').delete().where({
				userId: req.currentUser.id,
				followedUserId: parseInt(req.params.followedUserId)
			});
		}).then(() => {
			res.redirect(`/posts/${req.query.redirectToPost}`);
		});
	});

	return router;
};
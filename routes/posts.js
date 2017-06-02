'use strict';

const Promise = require('bluebird');
const expressPromiseRouter = require('express-promise-router');
const checkit = require('checkit');
const multer = require('multer');
const uuidV4 = require('uuid/v4');
const path = require('path');
const rfr = require('rfr');
const marked = require('marked');
const slug = require('slug');

const requireSignin = rfr('middleware/require-signin');
const checkitPost = rfr('lib/checkit-post');
const splitFilterTags = rfr('lib/split-filter-tags');

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
	const storeTags = rfr('lib/store-tags');
	const storeSlug = rfr('lib/store-slug');
	const storePost = rfr('lib/store-post');
	const removeTags = rfr('lib/remove-tags');
	const updatePost = rfr('lib/update-post');
	const getTags = rfr('lib/get-tags')(knex);

	let router = expressPromiseRouter();

	let storage = multer.diskStorage({
		destination: path.join(__dirname, '../uploads/postsPics'),
		filename: (req, file, cb) => {
			cb(null, `${uuidV4()}-${file.originalname}`);
		}
	});

	let storeUpload = Promise.promisify(multer({storage: storage}).single('postPic'));

	/* create */
	router.get('/create', requireSignin(environment), (req, res) => {
		console.log('GET/create');

		res.render('posts/create', {body: req.body});
	});

	router.post('/create', requireSignin(environment), (req, res) => {
		return Promise.try(() => {
			return storeUpload(req, res);
		}).then(() => {
			logReqBody(environment, req.body, 'POST/create req.body: ');
			logReqFile(environment, req.file, 'POST/create req.file: ');

			return checkitPost(req.body);
		}).then(() => {
			return knex.transaction(function(trx) {
				return Promise.try(() => {
					return storePost(trx)({
						userId: req.currentUser.id,
						title: req.body.title,
						subtitle: req.body.subtitle,
						body: req.body.body,
						pic: (req.file != null ? req.file.filename : undefined),
						isDraft: (req.body.publish == null)
					}).then((postIds) => {
						console.log('POST/create postIds: ', postIds);

						let postId = postIds[0];
						let tags = req.body.tags;

						return Promise.all([
							storeSlug(trx)(postId, slug(req.body.title)),
							((tags != null) ? storeTags(trx)(postId, splitFilterTags(tags)) : undefined)
						]).then(() => {
							res.redirect(`/posts/${postId}`);
						});
					});
				});
			});
		}).catch(checkit.Error, (err) => {
			logError(environment, err, 'checkitError');
			logReqBody(environment, req.body, 'POST/create - Checkit Error! req.body:');

			res.render('posts/create', {
				errors: err.errors,
				body: req.body
			});
		});
	});

	/* edit */
	router.get('/:id/edit', requireSignin(environment), (req, res) => {
		console.log('GET/:id/edit');

		let postId = req.params.id;

		return Promise.try(() => {
			return knex('posts').where({id: postId});
		}).then((posts) => {
			if (posts.length === 0) {
				throw new Error('The selected post does not exist');
			} else {
				return Promise.try(() => {
					return getTags(postId);
				}).then((tags) => {
					res.render('posts/edit', {
						postId: postId,
						post: posts[0],
						tags: tags.join(", ")
					});
				});
			}
		});
	});

	router.post('/:id/edit', requireSignin(environment), (req, res) => {
		let postId = req.params.id;

		return Promise.try(() => {
			return storeUpload(req, res);
		}).then(() => {
			logReqBody(environment, req.body, 'POST/:id/edit req.body: ');
			logReqFile(environment, req.file, 'POST/:id/edit req.file: ');

			return checkitPost(req.body);
		}).then(() => {
			return knex('posts').where({id: postId});
		}).then((posts) => {
			return knex.transaction(function(trx) {
				return Promise.try(() => {
					/* only update slug if updated title !== title on db */
					if (req.body.title !== posts[0].title) {
						return storeSlug(trx)(postId, slug(req.body.title));
					}
				}).then(() => {
					console.log('POST/:id/edit updatePost(trx)(postId, {...})');

					return updatePost(trx)(postId, {
						title: req.body.title,
						subtitle: req.body.subtitle,
						body: req.body.body,
						pic: (req.file != null ? req.file.filename : undefined),
						isDraft: (req.body.publish == null),
						updatedAt: knex.fn.now()
					});
				}).then(() => {
					if (req.body.tags != null) {
						console.log('POST/:id/edit storeTags(trx)(postId, splitFilterTags(req.body.tags))');

						return storeTags(trx)(postId, splitFilterTags(req.body.tags));
					}
				}).then(() => {
					if (req.body.tags != null) {
						console.log('POST/:id/edit removeTags(trx)(postId, splitFilterTags(req.body.tags))');

						return removeTags(trx)(postId, splitFilterTags(req.body.tags));
					} else {
						console.log('POST/:id/edit removeTags(trx)(postId, [])');
						return removeTags(trx)(postId, []);
					}
				}).then(() => {
					res.redirect(`/posts/${postId}`);
				});
			});
		}).catch(checkit.Error, (err) => {
			logError(environment, err, 'checkitError');

			res.render('posts/edit', {
				postId: postId,
				errors: err.errors,
				body: req.body
			});
		});
	});

	/* read */
	router.get('/:id', (req, res) => {
		console.log('GET/:id');

		let postId = req.params.id;

		return Promise.try(() => {
			return knex('posts').where({id: postId});
		}).then((posts) => {
			if (posts.length === 0) {
				throw new Error('The selected post does not exist');
			} else {
				let post = posts[0];

				return Promise.try(() => {
					return knex('users').where({id: post.userId});
				}).then((users) => {
					return Promise.try(() => {
						return getTags(postId);
					}).then((postTags) => {
						res.render('posts/read', {
							tags: postTags,
							user: users[0],
							post: post,
							postBody: marked(post.body)
						});
					});
				});
			}
		});
	});

	/* delete */

	return router;
};
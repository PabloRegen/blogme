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
const logReqBody = rfr('lib/log-req-body');
const logReqFile = rfr('lib/log-req-file');
const logError = rfr('lib/log-error');

const storeTags = rfr('lib/store-tags');
const storeSlug = rfr('lib/store-slug');
const storePost = rfr('lib/store-post');
const removeTags = rfr('lib/remove-tags');
const updatePost = rfr('lib/update-post');

module.exports = function(knex, environment) {
	const getTags = rfr('lib/get-tags')(knex);

	let router = expressPromiseRouter();

	let storage = multer.diskStorage({
		destination: path.join(__dirname, '../uploads'),
		filename: (req, file, cb) => {
			cb(null, `${uuidV4()}-${file.originalname}`);
		}
	});

	let storeUpload = Promise.promisify(multer({storage: storage}).single('postPic'));

	/* create */
	router.get('/create', requireSignin(environment), (req, res) => {
		logReqBody(environment, 'GET/create req.body:', req.body);

		res.render('posts/create');
	});

	router.post('/create', requireSignin(environment), (req, res) => {
		return Promise.try(() => {
			return storeUpload(req, res);
		}).then(() => {
			logReqBody(environment, 'POST/create req.body: ', req.body);
			logReqFile(environment, 'POST/create req.file: ', req.file);

			return checkitPost(req.body);
		}).then(() => {
			let title = req.body.title;
			let subtitle = req.body.subtitle;
			let body = req.body.body;
			let tags = req.body.tags;
			let publish = req.body.publish;

			return knex.transaction(function(trx) {
				return Promise.try(() => {
					return storePost(trx)({
						userId: req.currentUser.id,
						title: title,
						subtitle: (subtitle !== '' ? subtitle : null),
						body: body,
						pic: (req.file != null ? req.file.filename : undefined),
						isDraft: (publish == null)
					});
				}).then((postIds) => {
					let postId = postIds[0];

					return Promise.all([
						storeSlug(trx)(postId, slug(title)),
						(tags !== '' ? storeTags(trx)(postId, splitFilterTags(tags)) : undefined)
					]).then(() => {
						return postId;
					});
				});
			});
		}).then((postId) => {				
			res.redirect(`/posts/${postId}`);
		}).catch(checkit.Error, (err) => {
			logError(environment, 'checkitError', err);

			/* The data that forms the body of the request is multipart encoded to allow for file uploads
			therefore the usual order: bodyparser, setting res.locals, route with route middleware does not work here
			because bodyparser, which only parses urlencoded data, gets skipped 
			& res.locals.body gets set before the request data gets handled
			so body needs to be set within the route after multer (which handles multipart/form-data) runs */
			res.render('posts/create', {
				errors: err.errors,
				body: req.body
			});
		});
	});

	/* edit */
	router.get('/:id/edit', requireSignin(environment), (req, res) => {
		logReqBody(environment, 'GET/:id/edit req.body:', req.body);

		let postId = parseInt(req.params.id);

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
		let postId = parseInt(req.params.id);

		return Promise.try(() => {
			return storeUpload(req, res);
		}).then(() => {
			logReqBody(environment, 'POST/:id/edit req.body: ', req.body);
			logReqFile(environment, 'POST/:id/edit req.file: ', req.file);

			return checkitPost(req.body);
		}).then(() => {
			return knex('posts').where({id: postId});
		}).then((posts) => {
			let titleOnDB = posts[0].title;
			let title = req.body.title;
			let subtitle = req.body.subtitle;
			let body = req.body.body;
			let tags = req.body.tags;
			let publish = req.body.publish;

			// return knex.transaction(function(trx) {
				return Promise.try(() => {
					if (title !== titleOnDB) {
						return storeSlug(knex)(postId, slug(title));
					}
				}).then(() => {
					return updatePost(knex)(postId, {
						title: title,
						subtitle: (subtitle !== '' ? subtitle : null),
						body: body,
						pic: (req.file != null ? req.file.filename : undefined),
						isDraft: (publish == null),
						updatedAt: knex.fn.now()
					});
				}).then(() => {
					if (tags !== '') {
						return storeTags(knex)(postId, splitFilterTags(tags));
					}
				}).then(() => {
					return removeTags(knex)(postId, splitFilterTags(tags));
				});
			// });
		}).then(() => {
			res.redirect(`/posts/${postId}`);
		}).catch(checkit.Error, (err) => {
			logError(environment, 'checkitError', err);

			/* body needs to get passed within the render call because the form is multipart enctype 
			See additional explanation at POST/create route */
			res.render('posts/edit', {
				postId: postId,
				errors: err.errors,
				body: req.body
			});
		});
	});

	/* read */
	router.get('/:id', (req, res) => {
		logReqBody(environment, 'GET/:id req.body:', req.body);

		let postId = parseInt(req.params.id);

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
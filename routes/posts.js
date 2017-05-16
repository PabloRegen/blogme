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
const splitFilterTags = rfr('lib/split-filter-tags');
const checkitPost = rfr('lib/checkit-post');


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
	const storeTags = rfr('lib/store-tags')(knex);
	const storeSlug = rfr('lib/store-slug')(knex);
	const storePost = rfr('lib/store-post')(knex);
	const updatePost = rfr('lib/update-post')(knex);
	const updateSlugsStatusFalse = rfr('lib/update-slugs-status-false')(knex);
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
		logReqBody(environment, req.body, 'create GET! req.body:');

		res.render('posts/create', {body: req.body});
	});

	router.post('/create', requireSignin(environment), (req, res) => {
		return Promise.try(() => {
			return storeUpload(req, res);
		}).then(() => {
			logReqBody(environment, req.body, 'create POST! req.body:');
			logReqFile(environment, req.file, 'create POST! req.file:');

			return checkitPost(req);
		}).then(() => {
			return storePost(req);
		}).then((postIds) => {
			console.log('postIds returned when inserting new post on db: ', postIds);

			let postId = postIds[0];
			let tags = req.body.tags;
			let title = req.body.title;

			return Promise.try(() => {
				return Promise.all([
					storeSlug(postId, slug(title)),
					((tags != null) ? storeTags(postId, splitFilterTags(tags)) : undefined)
				])
			}).then(() => {
				res.redirect(`/posts/${postId}`);
			});
		}).catch(checkit.Error, (err) => {
			logError(environment, err, 'checkitError');
			logReqBody(environment, req.body, 'create POST-Checkit Error! req.body:');

			res.render('posts/create', {
				errors: err.errors,
				body: req.body
			});
		});
	});

	/* edit */
	router.get('/:id/edit', requireSignin(environment), (req, res) => {
		logReqBody(environment, req.body, 'edit GET! req.body:');

		let postId = req.params.id;

		return Promise.try(() => {
			return knex('posts').where({id: postId});
		}).then((posts) => {
			console.log('posts: ', posts);

			if (posts.length === 0) {
				throw new Error('The selected post does not exist');
			} else {
				return Promise.try(() => {
					return getTags(postId);
				}).then((existingTags) => {
					console.log('existingTags: ', existingTags);
					console.log('existingTags.toString(): ', existingTags.toString());

					res.render('posts/edit', {
						postId: postId,
						post: posts[0],
						tags: existingTags.toString()
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
			logReqBody(environment, req.body, 'edit POST! req.body:');
			logReqFile(environment, req.file, 'edit POST! req.file:');

			return checkitPost(req);
		}).then(() => {
			return knex('posts').where({id: postId});
		}).then((posts) => {
			let title = req.body.title; 

			/* only update slug if updated title !== title on db */
			if (title !== posts[0].title) {
				return Promise.try(() => {
					return updateSlugsStatusFalse(postId);
				}).then(() => {
					return storeSlug(postId, slug(title));
				});
			}
		}).then(() => {
			return updatePost(req, postId);
		}).then(() => {
			res.redirect(`/posts/${postId}`);
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
		logReqBody(environment, req.body, 'read GET! req.body:');

		return Promise.try(() => {
			return knex('posts').where({id: req.params.id});
		}).then((posts) => {
			if (posts.length === 0) {
				throw new Error('The selected post does not exist');
			} else {
				// if (environment === 'development') {
				// 	console.log('posts[0]: ', typeof(posts[0]), posts[0]);
				// }

				return Promise.try(() => {
					return knex('users').where({id: posts[0].userId});
				}).then((users) => {
					console.log('users: ', users);

					return Promise.try(() => {
						return knex('tags_posts')
							.where({postId: req.params.id})
							.select('tagId')
							.orderBy('tagId', 'asc'); 
							// .returning('tagId');
					}).map((tagId) => {
						console.log('tagId: ', tagId);

						return knex('tags')
							.where({id: tagId.tagId})
							.select('name'); 
							// .returning('name')
					}).then((tagName) => {
						console.log('tagName: ', tagName);

						let tagsRender = [];

						for(let i = 0; i < tagName.length; i++) {
							tagsRender.push(tagName[i][0].name)
						}

						console.log('tagsRender: ', tagsRender);

						res.render('posts/read', {
							tags: tagsRender,
							user: users[0],
							post: posts[0],
							postBody: marked(posts[0].body)
						});
					});
				});
			}
		});
	});

	/* delete */

	return router;
};
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

			return checkit({
				title: 'required',
				body: 'required'
			}).run(req.body);
		}).then(() => {
			return knex('posts')
				.insert({
					userId: req.currentUser.id,
					title: req.body.title,
					subtitle: req.body.subtitle,
					body: req.body.body,
					pic: (req.file != null ? req.file.filename : undefined),
					isDraft: (req.body.publish == null)
				})
				.returning('id');
		}).then((postId) => {
			// console.log('post_id: ', post_id, typeof(post_id));
			// console.log('post_id[0]: ', post_id[0], typeof(post_id[0]));
			return knex('slugs')
				.insert({
					postId: postId[0],
					name: slug(req.body.title),
					isCurrent: true
				})
				.returning('postId');
		}).then((postId) => {
			// FIXME!!! Need to solve 2 cases: 
			// 1. more than one tag entered at once
			// 2. tags containing more than 1 word

			let tags = req.body.tags;

			if (tags != null && tags.trim() !== '') {
				return Promise.try(() => {
					return knex('tags')
						.insert({
							name: tags,
						}).returning('id');
				}).then((tagId) => {
					return knex('tags_posts')
						.insert({
							tagId: tagId[0],
							postId: postId[0]
						}).returning('postId');
				});
			} else {
				return postId;
			}
		}).then((postId) => {
			res.redirect(`/posts/${postId[0]}`);
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

		return Promise.try(() => {
			return knex('posts').where({id: req.params.id});
		}).then((posts) => {
			if (posts.length === 0) {
				throw new Error('The selected post does not exist');
			} else {	
				res.render('posts/edit', {
					postId: req.params.id,
					post: posts[0]
				});
			}
		});
	});

	router.post('/:id/edit', requireSignin(environment), (req, res) => {
		return Promise.try(() => {
			return storeUpload(req, res);
		}).then(() => {
			logReqBody(environment, req.body, 'edit POST! req.body:');
			logReqFile(environment, req.file, 'edit POST! req.file:');

			return checkit({
				title: 'required',
				body: 'required'
			}).run(req.body);
		}).then(() => {
			return knex('posts').where({id: req.params.id});
		}).then((post) => {
			/* only update slug if updated title !== title on db */
			if (req.body.title !== post[0].title) {
				return Promise.try(() => {
					return knex('slugs')
						.where({
							postId: req.params.id, 
							isCurrent: true
						})
						.update({isCurrent: false});
				}).then(() => {
					return knex('slugs')
						.insert({
							postId: req.params.id,
							name: slug(req.body.title),
							isCurrent: true
						});
				});
			}
		}).then(() => {
			return knex('posts')
				.where({id: req.params.id})
				.update({
					title: req.body.title,
					subtitle: req.body.subtitle,
					body: req.body.body,
					pic: (req.file != null ? req.file.filename : undefined),
					isDraft: (req.body.publish == null),
					updatedAt: knex.fn.now()
				});
		}).then(() => {
			res.redirect(`/posts/${req.params.id}`);
		}).catch(checkit.Error, (err) => {
			logError(environment, err, 'checkitError');

			res.render('posts/edit', {
				postId: req.params.id,
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
					return Promise.try(() => {
						return knex('tags_posts')
							.where({postId: req.params.id})
							.returning('tagId');
					}).then((tagId) => {
						return knex('tags')
							.where({id: tagId[0].id})
							.returning('name')
					}).then((tagName) => {
						res.render('posts/read', {
							tag: tagName[0].name,
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
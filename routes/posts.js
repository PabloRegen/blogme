'use strict';

const Promise = require('bluebird');
const expressPromiseRouter = require('express-promise-router');
const checkit = require('checkit');
const multer = require('multer');
const uuidV4 = require('uuid/v4');
const path = require('path');
const rfr = require('rfr');

const requireSignin = rfr('middleware/require-signin');

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

	let storage = multer.diskStorage({
		destination: path.join(__dirname, '../uploads'),
		filename: (req, file, cb) => {
			// cb(null, `${uuidV4()}-${file.originalname}`);
			// cb(null, `${file.originalname}`);
			cb(null, file.fieldname);
		}
	});

	let upload = multer({storage: storage});
	// let upload = multer({dest: path.join(__dirname, '../uploads')});

	/* create */
	router.get('/create', requireSignin, (req, res) => {
		logReqBody(environment, req.body, 'create get! req.body:');

		res.render('posts/create');
	});

	router.post('/create', requireSignin, upload.single('postPic'), (req, res) => {
		logReqBody(environment, req.body, 'create post! req.body:');
		console.log('req.file is: ', req.file);

		return Promise.try(() => {
			return checkit({
				title: 'required',
				body: 'required'
			}).run(req.body);
		}).then(() => {
			return knex('posts').insert({
				userId: req.currentUser.id,
				title: req.body.title,
				subtitle: req.body.subtitle,
				body: req.body.body
			}).returning('id');
		}).then((postId) => {
			res.redirect(`/posts/${postId}`);
		}).catch(checkit.Error, (err) => {
			logError(environment, err, 'checkitError');

			res.render('posts/create', {errors: err.errors});
		});
	});

	/* read */
	router.get('/:id', (req, res) => {
		logReqBody(environment, req.body, 'read get! req.body:');

		return Promise.try(() => {
			return knex('posts').where({id: req.params.id});
		}).then((posts) => {
			if (posts.length === 0) {
				throw new Error('The selected post does not exist');
			} else {
				res.render('posts/read', {post: posts[0]});
			}
		});
	});

	/* edit */
	router.get('/:id/edit', requireSignin, (req, res) => {
		logReqBody(environment, req.body, 'edit get! req.body:');

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

	router.post('/:id/edit', requireSignin, (req, res) => {
		logReqBody(environment, req.body, 'edit post! req.body:');

		return Promise.try(() => {
			return checkit({
				title: 'required',
				body: 'required'
			}).run(req.body);
		}).then(() => {
			return knex('posts')
				.where({id: req.params.id})
				.update({
					title: req.body.title,
					subtitle: req.body.subtitle,
					body: req.body.body,
					updatedAt: knex.fn.now()
				})
			;
		}).then(() => {
			res.redirect(`/posts/${req.params.id}`);
		}).catch(checkit.Error, (err) => {
			logError(environment, err, 'checkitError');

			res.render('posts/edit', {
				postId: req.params.id,
				errors: err.errors
			});
		});
	});

	/* delete */

	return router;
};
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
		destination: path.join(__dirname, '../uploads'),
		filename: (req, file, cb) => {
			cb(null, `${uuidV4()}-${file.originalname}`);
		}
	});

	let storeUpload = Promise.promisify(multer({storage: storage}).single('postPic'));

	/* create */
	router.get('/create', requireSignin(environment), (req, res) => {
		logReqBody(environment, req.body, 'create get! req.body:');

		res.render('posts/create');
	});

	router.post('/create', requireSignin(environment), (req, res) => {

		return Promise.try(() => {
			return storeUpload(req, res);
		}).then(() => {
			logReqBody(environment, req.body, 'create post! req.body:');
			logReqFile(environment, req.file, 'create post! req.file:');

			return checkit({
				title: ['required', 'maxLength:200'],
				subtitle: 'maxLength:300',
				body: 'required'
			}).run(req.body);
		}).then(() => {
			return knex('posts').insert({
				userId: req.currentUser.id,
				title: req.body.title,
				subtitle: req.body.subtitle,
				body: req.body.body,
				pic: req.file.filename
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
	router.get('/:id/edit', requireSignin(environment), (req, res) => {
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

	router.post('/:id/edit', requireSignin(environment), (req, res) => {
		logReqBody(environment, req.body, 'edit post! req.body:');

		return Promise.try(() => {
			return checkit({
				title: ['required', 'maxLength:200'],
				subtitle: 'maxLength:300',
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
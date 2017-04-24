'use strict';

const Promise = require('bluebird');
const expressPromiseRouter = require('express-promise-router');
const checkit = require('checkit');
const multer = require('multer');
const uuidV4 = require('uuid/v4');
const marked = require('marked');
const marked1 = require('jstransformer')(require('jstransformer-marked'));
const path = require('path');
const rfr = require('rfr');

const pug = require('pug');

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
		logReqBody(environment, req.body, 'create GET! req.body:');

		res.render('posts/create');
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
			return knex('posts').insert({
				userId: req.currentUser.id,
				title: req.body.title,
				subtitle: req.body.subtitle,
				body: req.body.body,
				pic: (req.file != null ? req.file.filename : undefined),
				isDraft: (req.body.publish == null)
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
		logReqBody(environment, req.body, 'read GET! req.body:');

		return Promise.try(() => {
			return knex('posts').where({id: req.params.id});
		}).then((posts) => {
			if (posts.length === 0) {
				throw new Error('The selected post does not exist');
			} else {
				console.log('posts[0]: ', typeof(posts[0]), posts[0]);
				console.log('------');
				console.log(marked('# Heading 1'));
				console.log(marked('Hello1 **Hello2** Hello3'));
				console.log(marked('> Hello1 *Hello2* Hello3'));
				console.log('------');
				console.log(marked1.render('# Heading 1').body);
				console.log(marked1.render('Hello1 **Hello2** Hello3').body);
				console.log(marked1.render('> Hello1 *Hello2* Hello3').body);
				console.log('------');
				console.log('<h1 id="heading-1">Heading 1</h1>');
				console.log('<p>Hello1 <strong>Hello2</strong> Hello3</p>');
				console.log('<blockquote><p>Hello1 <em>Hello2</em> Hello3</p></blockquote>');
				console.log('------');

				console.log(pug.renderFile('views/posts/read.pug', {
  					post: posts[0],
					postBody: marked(posts[0].body),

					test1: marked('# Heading 1'),
					test2: marked('Hello1 **Hello2** Hello3'),
					test3: marked('> Hello1 *Hello2* Hello3'),

					test11: marked1.render('# Heading 1').body,
					test12: marked1.render('Hello1 **Hello2** Hello3').body,
					test13: marked1.render('> Hello1 *Hello2* Hello3').body,

					test21: `<h1 id="heading-1">Heading 1</h1>`,
					test22: `<p>Hello1 <strong>Hello2</strong> Hello3</p>`,
					test23: `<blockquote><p>Hello1 <em>Hello2</em> Hello3</p></blockquote>`,

					shit: marked('What the **fuck**!')
				}));

				res.render('posts/read.pug', {
					post: posts[0],
					postBody: marked(posts[0].body),

					test1: marked('# Heading 1'),
					test2: marked('Hello1 **Hello2** Hello3'),
					test3: marked('> Hello1 *Hello2* Hello3'),

					test11: marked1.render('# Heading 1').body,
					test12: marked1.render('Hello1 **Hello2** Hello3').body,
					test13: marked1.render('> Hello1 *Hello2* Hello3').body,

					test21: `<h1 id="heading-1">Heading 1</h1>`,
					test22: `<p>Hello1 <strong>Hello2</strong> Hello3</p>`,
					test23: `<blockquote><p>Hello1 <em>Hello2</em> Hello3</p></blockquote>`,

					shit: marked('What the **fuck**!')
					//shit: :marked1('What the **fuck**!') // trying to use filters
				});
			}
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
		logReqBody(environment, req.body, 'edit POST! req.body:');

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
					updatedAt: knex.fn.now(),
					isDraft: (req.body.publish == null)
				});
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
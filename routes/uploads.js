'use strict';

const Promise = require('bluebird');
const expressPromiseRouter = require('express-promise-router');
const checkit = require('checkit');
const multer = require('multer');
const uuidV4 = require('uuid/v4');
const path = require('path');
const rfr = require('rfr');

const requireSignin = rfr('middleware/require-signin');
const logReqBody = rfr('lib/log-req-body');
const logReqFile = rfr('lib/log-req-file');
const logError = rfr('lib/log-error');

// const storeImages = rfr('lib/store-images');

module.exports = function(knex, environment) {
	let router = expressPromiseRouter();

	let storage = multer.diskStorage({
		destination: path.join(__dirname, '../uploads'),
		filename: (req, file, cb) => {
			cb(null, `${uuidV4()}-${file.originalname}`);
		}
	});

	let storeUpload = Promise.promisify(multer({storage: storage}).single('image'));
	// let storeUpload = Promise.promisify(multer({storage: storage}).array('images'));
	// req.files is array of `images` files

	/* upload */
	router.get('/upload', requireSignin(environment), (req, res) => {
		res.render('uploads/upload');
	});

	router.post('/upload', requireSignin(environment), (req, res) => {
		return Promise.try(() => {
			return storeUpload(req, res);
		}).then(() => {
			logReqBody(environment, 'POST/upload req.body: ', req.body);
			logReqFile(environment, 'POST/upload req.file: ', req.file);

			if (req.file == null) {
				res.render('uploads/upload', {
					body: req.body,
					message: 'Please choose an image'
				});
			} else {
				return Promise.try(() => {
					return knex('images').insert({
						userId: req.currentUser.id,
						path: req.file.filename,
						originalName: req.file.originalname,
						size: req.file.size,
						caption: req.body.caption,
						ownerName: req.body.owner,
						licenseType: req.body.license,
						originalURL: req.body.url,
						// height: ,
						// width: ,
						// dated: 
					}).returning('id');
				}).then((imageIds) => {
					res.redirect(`/uploads/${imageIds[0]}`);
				});
			}
		});
	});
	// pic: req.files != null && req.files.postPic != null ? req.files.postPic[0] : undefined,

	/* edit */
	router.get('/:id/edit', requireSignin(environment), (req, res) => {
		return Promise.try(() => {
			return knex('images').where({id: req.params.id});
		}).then((images) => {
			if (images.length === 0) {
				throw new Error('The selected image does not exist');
			} else {
				res.render('uploads/edit', {image: images[0]});
			}
		});
	});

	router.post('/:id/edit', requireSignin(environment), (req, res) => {

	});

	/* delete */
	router.post('/:id/delete', requireSignin(environment), (req, res) => {
		logReqBody(environment, 'POST/:id/delete req.body:', req.body);

		return Promise.try(() => {
			return knex('images').where({id: req.params.id}).update({deletedAt: knex.fn.now()});
		}).then(() => {
			res.redirect('/uploads/upload');
		});
	});

	/* display 1 image */
	router.get('/:id', (req, res) => {
		logReqBody(environment, 'GET/:id req.body: ', req.body);

		return Promise.try(() => {
			return knex('images').where({id: req.params.id});
		}).then((images) => {
			console.log(images);

			if (images.length === 0) {
				throw new Error('The selected image does not exist');
			} else {
				res.render('uploads/display', {
					image: images[0],
					size: Math.round(images[0].size/1000)
				});
			}
		});
	});

	return router;
};
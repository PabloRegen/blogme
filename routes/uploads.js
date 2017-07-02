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
const nullIfEmptyString = rfr('lib/null-if-empty-string');

// const storeImages = rfr('lib/store-images');

module.exports = function(knex, environment) {
	let router = expressPromiseRouter();

	let storage = multer.diskStorage({
		destination: path.join(__dirname, '../uploads'),
		filename: (req, file, cb) => {
			cb(null, `${uuidV4()}-${file.originalname}`);
		}
	});

	let limits = {
		fileSize: 10000000,
	};

	let storeUpload = Promise.promisify(multer({
		storage: storage,
		limits: limits
	}).array('images', 20));
	// req.files is array of `images`. Optionally error out if more than maxCount files are uploaded

	/* upload */
	router.get('/upload', requireSignin(environment), (req, res) => {
		res.render('uploads/upload');
	});

	router.post('/upload', requireSignin(environment), (req, res) => {
		return Promise.try(() => {
			return storeUpload(req, res);
		}).then(() => {
			logReqBody(environment, 'POST/upload req.body: ', req.body);
			logReqFile(environment, 'POST/upload req.files: ', req.files);

			if (req.files.length === 0) {
				res.render('uploads/upload', {
					message: 'Please choose at least one image'
				});
			} else {
				return Promise.map(req.files, (image) => {
					return knex('images').insert({
						userId: req.currentUser.id,
						path: image.filename,
						originalName: image.originalname,
						size: image.size,
						// height: ,
						// width: ,
						// dated: 
					});
				}).then(() => {
					res.redirect('/uploads/upload');
				});
			}
		});
	});
	// pic: req.files != null && req.files.postPic != null ? req.files.postPic[0] : undefined,

	/* edit */
	router.get('/:id/edit', requireSignin(environment), (req, res) => {
		return Promise.try(() => {
			return knex('images').where({id: parseInt(req.params.id)});
		}).then((images) => {
			if (images.length === 0) {
				throw new Error('The selected image does not exist');
			} else {
				res.render('uploads/edit', {image: images[0]});
			}
		});
	});

	router.post('/:id/edit', requireSignin(environment), (req, res) => {
		logReqBody(environment, 'POST/:id/edit req.body:', req.body);

		return Promise.try(() => {
			return knex('images').where({id: parseInt(req.params.id)}).update({
				/* with bodyParser.urlencoded, values in req.body can never be null or undefined (they're always strings) */
				caption: nullIfEmptyString(req.body.caption),
				ownerName: nullIfEmptyString(req.body.owner),
				licenseType: nullIfEmptyString(req.body.license),
				originalURL: nullIfEmptyString(req.body.url)
			});
		}).then(() => {
			res.redirect('/uploads/overview/1');
		});
	});

	/* delete */
	router.post('/:id/delete', requireSignin(environment), (req, res) => {
		logReqBody(environment, 'POST/:id/delete req.body:', req.body);

		return Promise.try(() => {
			return knex('images').where({id: parseInt(req.params.id)}).update({deletedAt: knex.fn.now()});
		}).then(() => {
			res.redirect('/uploads/overview/1');
		});
	});

	/* overview all images */
	router.get('/overview/:page', requireSignin(environment), (req, res) => {
		let page = parseInt(req.params.page);
		let imagesPerPage = 4;
		let imageNumber = (page - 1) * imagesPerPage;

		if (page < 1) {
			throw new Error('This page does not exist');
		} else {
			let images = function() {
				let query = knex('images').where({userId: req.currentUser.id});

				if (req.query.deleted !== '1') {
					return query.whereNull('deletedAt');
				} else {
					return query.whereNotNull('deletedAt');
				}
			};

			return Promise.all([
				images().offset(imageNumber).limit(imagesPerPage), 
				images().count()
			]).spread((images, numberOfImages) => {
				let numberOfPages = Math.ceil(parseInt(numberOfImages[0].count) / imagesPerPage);

				if (page > numberOfPages && numberOfPages > 0) {
					throw new Error('This page does not exist');
				} else {
					res.render('uploads/overview', {
						images: images,
						page: page,
						numberOfPages: numberOfPages,
						deleted: req.query.deleted
					});
				}
			});
		}
	});

	/* display one image details */
	router.get('/:id', requireSignin(environment), (req, res) => {
		logReqBody(environment, 'GET/:id req.body: ', req.body);

		return Promise.try(() => {
			return knex('images').where({id: parseInt(req.params.id)});
		}).then((images) => {
			if (images.length === 0) {
				throw new Error('The selected image does not exist');
			} else {
				res.render('uploads/details', {
					image: images[0]
				});
			}
		});
	});

	return router;
};
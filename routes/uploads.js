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
		destination: path.join(__dirname, '../uploads/postsImages'),
		filename: (req, file, cb) => {
			cb(null, `${uuidV4()}-${file.originalname}`);
		}
	});

	let storeUpload = Promise.promisify(multer({storage: storage}).single('image'));
	// req.files is array of `postimages` files

	/* upload */
	router.get('/upload', requireSignin(environment), (req, res) => {
		logReqBody(environment, 'GET/upload req.body: ', req.body);
		
		res.render('uploads/upload');
	});

	router.post('/upload', requireSignin(environment), (req, res) => {
		return Promise.try(() => {
			return storeUpload(req, res);
		}).then(() => {
			logReqBody(environment, 'POST/upload req.body: ', req.body);
			logReqFile(environment, 'POST/upload req.file: ', req.file);

			// return Promise.try(() => {
				return knex('postimages').insert({
					userId: req.currentUser.id,
					path: req.file.path,
					currentName: req.file.filename,
					originalName: req.file.originalname,
					size: Math.round(req.file.size / 1000),
					caption: req.body.caption,
					ownerName: req.body.owner,
					licenseType: req.body.license,
					originalURL: req.body.url,
					// height: ,
					// width: ,
					// dated: 
				});
			// });
		}).then(() => {
			res.end();
		});
		// pic: req.files != null && req.files.postPic != null ? req.files.postPic[0] : undefined,
	});

	/* edit */
	router.get('/:id/edit', requireSignin(environment), (req, res) => {

	});

	router.post('/:id/edit', requireSignin(environment), (req, res) => {

	});

	/* delete */
	router.get('/:id/delete', (req, res) => {

	});

	/* display */
	router.get('/:id', (req, res) => {

	});

	return router;
};
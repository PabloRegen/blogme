'use strict';

const checkit = require('checkit');

module.exports = function(req) {
	return checkit({
		title: 'required',
		body: 'required'
	}).run(req.body);
};
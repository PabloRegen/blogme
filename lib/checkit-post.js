'use strict';

const checkit = require('checkit');

module.exports = function(object) {
	return checkit({
		title: ['required', 'alphaDash'],
		body: 'required'
	}).run(object);
};
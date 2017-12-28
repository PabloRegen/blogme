'use strict';

const checkit = require('checkit');

module.exports = function(object) {
	return checkit({
		title: ['required', (title) => {
			if (title.trim().length === 0) {
				throw new Error('The title must contain at least one character other than spaces')
			}
		}]
	}).run(object);
};
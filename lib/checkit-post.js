'use strict';

const checkit = require('checkit');
const rfr = require('rfr');
const errors = rfr('lib/errors');

module.exports = function(object) {
	return checkit({
		title: ['required', (title) => {
			if (title.trim() === '') {
				throw new errors.ValidationError('The title must contain at least one character other than spaces')
			} else if (title[0] === ' ' || title[title.length - 1] === ' ') {
				throw new errors.ValidationError('Please remove all spaces from the start and end of the title')
			}
		}],
		body: 'required'
	}).run(object);
};
'use strict';

module.exports = function(tags) {
	return tags.split(',').map((tag) => {
		return tag.trim();
	}).filter((tag) => {
		return tag !== '';
	});
};
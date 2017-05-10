'use strict';

module.exports = function(tags) {
	console.log('split-filter-tags.js tags: ->', tags, '<-  typeof tags: ', typeof(tags));

	return tags.split(',').map((tag) => {
		return tag.trim();
	}).filter((tag) => {
		return tag !== '';
	});
};
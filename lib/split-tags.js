'use strict'

module.exports = function(tagsInput) {
	return tagsInput.split(',').map((tag) => {
		return tag.trim();
	}).filter((tag) => {
		return tag !== '';
	});
};
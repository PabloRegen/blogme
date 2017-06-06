'use strict';

exports.up = function(knex, Promise) {
	return knex.schema.alterTable('tags_posts', (t) => {
		t.unique(['tagId', 'postId']);
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.alterTable('tags_posts', (t) => {
		t.dropUnique(['tagId', 'postId']);
	});
};
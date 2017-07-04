'use strict';

exports.up = function(knex, Promise) {
	return knex.schema.alterTable('likedposts', (t) => {
		t.unique(['postId', 'userId']);
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.alterTable('likedposts', (t) => {
		t.dropUnique(['postId', 'userId']);
	});
};
'use strict';

exports.up = function(knex, Promise) {
	return knex.schema.createTable('likedposts', (t) => {
		t.increments();
		t.integer('postId').notNullable().references('posts.id').onDelete('RESTRICT');
		t.integer('userId').notNullable().references('users.id').onDelete('RESTRICT');
		t.timestamp('likeAt', true).defaultTo(knex.raw('CURRENT_TIMESTAMP'));
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.dropTableIfExists('likedposts');
};
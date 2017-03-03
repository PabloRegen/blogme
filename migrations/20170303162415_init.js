'use strict';

exports.up = function(knex, Promise) {
	return Promise.all([
		knex.schema.createTable('users', function(t) {
			t.increments();
			t.text('username').notNullable().unique();
			t.text('email').notNullable().unique();
			t.text('pwHash').notNullable();
			t.text('name');
			t.text('bio');
			t.text('pic');
			t.timestamp('createdAt').defaultTo(knex.raw('CURRENT_TIMESTAMP'));
			t.timestamp('lastSigninAt', true);
			t.timestamp('lastSeenAt', true);
			t.timestamp('deletedAt', true);
			t.boolean('isActive').defaultTo(true);
			t.boolean('isVerified').defaultTo(false);
			t.boolean('isModerator').defaultTo(false);
		}),
		knex.schema.createTable('tags', function(t) {
			t.increments();
			t.text('name').notNullable().unique();
			t.timestamp('deletedAt', true);
		})
	]).then(function() {
		return knex.schema.createTable('posts', function(t) {
			t.increments();
			t.integer('userId').notNullable().references('users.id').onDelete('RESTRICT');
			t.text('title').notNullable();
			t.text('subtitle');
			t.text('body').notNullable();
			t.timestamp('postedAt').defaultTo(knex.raw('CURRENT_TIMESTAMP'));
			t.timestamp('updatedAt').defaultTo(knex.raw('CURRENT_TIMESTAMP'));
			t.timestamp('deletedAt', true);
			t.boolean('isVisible').defaultTo(true);
		});
	}).then(function() {
		return Promise.all([
			// Junction table to create many-to-many relationships between tags & posts tables, & avoid adding duplicate entries
			// It has an item for each time a given tag (from the 'tags' table) is assigned to a post (from the 'posts' table)
			knex.schema.createTable('tags_posts', function(t) {
				t.increments();
				t.integer('tagId').notNullable().references('tags.id').onDelete('RESTRICT');
				t.integer('postId').notNullable().references('posts.id').onDelete('RESTRICT');
			}),
			knex.schema.createTable('slugs', function(t) {
				t.increments();
				t.integer('postId').notNullable().references('posts.id').onDelete('RESTRICT');
				t.text('name').notNullable();
				t.boolean('isCurrent').defaultTo(false);
			})
		]);
	});
};

exports.down = function(knex, Promise) {
	return Promise.all([
		knex.schema.dropTableIfExists('tags_posts'),
		knex.schema.dropTableIfExists('slugs')
	]).then(function() {
		return knex.schema.dropTableIfExists('posts');
	}).then(function() {
		return Promise.all([
			knex.schema.dropTableIfExists('users'),
			knex.schema.dropTableIfExists('tags')
		]);
	});
};
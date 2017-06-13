'use strict';

exports.up = function(knex, Promise) {
	return knex.schema.createTable('postimages', (t) => {
		t.increments();
		t.integer('userId').notNullable().references('users.id').onDelete('RESTRICT');
		t.integer('postId').notNullable().references('posts.id').onDelete('RESTRICT'); 
		t.text('name').notNullable().unique();
		t.text('caption');
		t.text('format');
		t.integer('size');
		t.integer('height');
		t.integer('width');
		t.timestamp('dated');
		t.text('ownerName');
		t.text('licenseType');
		t.boolean('isReusable');
		t.text('originalLink');
		t.timestamp('postedAt').defaultTo(knex.raw('CURRENT_TIMESTAMP'));
		t.timestamp('deletedAt', true);
		t.boolean('isVisible').defaultTo(true);
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.dropTableIfExists('postimages');
};
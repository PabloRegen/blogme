'use strict';

exports.up = function(knex, Promise) {
	return knex.schema.alterTable('postimages', (t) => {
		t.dropColumns('postId', 'format', 'isReusable', 'postedAt', 'isVisible');
		t.text('path').notNullable();
		t.text('originalName').notNullable();
		t.timestamp('uploadedAt', true).notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
		t.timestamp('modifiedAt', true);
		t.renameColumn('name', 'currentName');
		t.renameColumn('originalLink', 'originalURL');
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.alterTable('postimages', (t) => {
		t.integer('postId').notNullable().references('posts.id').onDelete('RESTRICT');
		t.text('format');
		t.boolean('isReusable');
		t.timestamp('postedAt').defaultTo(knex.raw('CURRENT_TIMESTAMP'));
		t.boolean('isVisible').defaultTo(true);
		t.dropColumns('path', 'originalName', 'uploadedAt', 'modifiedAt');
		t.renameColumn('currentName', 'name');
		t.renameColumn('originalURL', 'originalLink');
	});
};
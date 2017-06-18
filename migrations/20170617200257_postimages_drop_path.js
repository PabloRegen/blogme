'use strict';

exports.up = function(knex, Promise) {
	return knex.schema.alterTable('postimages', (t) => {
		t.dropColumn('path');
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.alterTable('postimages', (t) => {
		t.text('path').notNullable();
	});
};
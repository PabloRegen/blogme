'use strict';

exports.up = function(knex, Promise) {
	return knex.schema.table('posts', (t) => {
		t.text('pic');
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.table('posts', (t) => {
		t.dropColumn('pic');
	});
};
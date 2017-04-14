'use strict';

exports.up = function(knex, Promise) {
	return knex.schema.table('posts', (t) => {
		t.boolean('isDraft').notNullable().defaultTo(false);
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.table('posts', (t) => {
		t.dropColumn('isDraft');
	});
};

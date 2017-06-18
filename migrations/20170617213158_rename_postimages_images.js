'use strict';

exports.up = function(knex, Promise) {
	return knex.schema.renameTable('postimages', 'images');
};

exports.down = function(knex, Promise) {
	return knex.schema.renameTable('images', 'postimages');
};
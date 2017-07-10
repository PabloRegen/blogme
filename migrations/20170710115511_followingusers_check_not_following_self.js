'user strict';

exports.up = function(knex, Promise) {
	return knex.raw('ALTER TABLE followingusers ADD CONSTRAINT check_not_following_self CHECK ("userId" <> "followedUserId")');
};

exports.down = function(knex, Promise) {
	return knex.raw('ALTER TABLE followingusers DROP CONSTRAINT check_not_following_self');
};
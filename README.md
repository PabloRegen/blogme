# Blogme

[Blogme](https://blogme.space) is a mostly backend blogging platform I designed, developed & deployed, written in JavaScript and storing data to a postgreSQL database.

It allows users to search, read & create posts with images & tags, create profiles, upload images to the db, see statistics, like posts and follow people. It also differentiates between admins and users roles.

## Technologies
* JavaScript
* HTML5
* CSS3
* Node.js
* Express
* various Node.js packages
* PostgreSQL
* Knex
* Pug

## Highlights
* Deployed to Digital Ocean, implementing reverse proxying and automatic HTTPS encryption through Caddy web server
* Automated error reporting and custom errors library
* PostgreSQL database and automated schema migrations with Knex
* Database transactions to ensure data integrity
* Scrypt encryption to secure data
* Bluebird implementation of promises to optimize performance
* Sanitized user input to filter out malicious HTML
* Pug template engine to create dynamic and reusable HTML documents
* Markdown syntax enabled to enhance user experience
* Session cookies for secure user authentication
* Flexbox improved CSS layouts

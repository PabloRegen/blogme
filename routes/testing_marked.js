const marked = require('marked');
// const marked1 = require('jstransformer')(require('jstransformer-marked'));

// marked.setOptions({
// 	renderer: new marked.Renderer(),
// 	gfm: true,
// 	tables: true,
// 	breaks: false,
// 	pedantic: false,
// 	sanitize: true, // Default: false? -> Sanitize the output. Ignore any HTML that has been input
// 	smartLists: true,
// 	smartypants: false
// });

console.log(marked('# Heading 1')); 				// <h1 id="heading-1">Heading 1</h1>
console.log(marked('###### Heading 6')); 			// <h6 id="heading-6">Heading 6</h6>
console.log(marked('Hello1 *Hello2* Hello3')); 		// <p>Hello1 <em>Hello2</em> Hello3</p>
console.log(marked('Hello1 **Hello2** Hello3')); 	// <p>Hello1 <strong>Hello2</strong> Hello3</p>
console.log(marked('Hello1 _**Hello2**_ Hello3')); 	// <p>Hello1 <em><strong>Hello2</strong></em> Hello3</p>
console.log(marked('Hello1 ~~Hello2~~ Hello3')); 	// <p>Hello1 <del>Hello2</del> Hello3</p>
console.log(marked('> Hello1 *Hello2* Hello3')); 	// <blockquote><p>Hello1 <em>Hello2</em> Hello3</p></blockquote>
console.log(marked('Hello1 `Hello2` Hello3')); 		// <p>Hello1 <code>Hello2</code> Hello3</p>
console.log(marked('This site was built using [GitHub Pages](https://pages.github.com/)'));
													// <p>This site was built using <a href="https://pages.github.com/">GitHub Pages</a></p>
console.log(marked(':marked(inline) **BOLD TEXT**'))// <p>:marked(inline) <strong>BOLD TEXT</strong></p>

/* These all work exactly as the above ones */
/*										
console.log(marked1.render('# Heading 1').body);
console.log(marked1.render('###### Heading 6').body);
console.log(marked1.render('Hello1 *Hello2* Hello3').body);
console.log(marked1.render('Hello1 **Hello2** Hello3').body);
console.log(marked1.render('Hello1 _**Hello2**_ Hello3').body);
console.log(marked1.render('Hello1 ~~Hello2~~ Hello3').body);
console.log(marked1.render('> Hello1 *Hello2* Hello3').body);
console.log(marked1.render('Hello1 `Hello2` Hello3').body);
console.log(marked1.render('This site was built using [GitHub Pages](https://pages.github.com/)').body);
console.log(marked1.render(':marked(inline) **BOLD TEXT**').body);
*/
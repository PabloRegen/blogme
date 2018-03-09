document.addEventListener('DOMContentLoaded', event => {
	Array.from(document.querySelectorAll('.autosize')).forEach(element => {
		element.addEventListener('input', event => {
			autoSize(event.target);
		});
	});
});

function autoSize(element) {
	element.style.height = (element.name==='body' ? '600px' : '40px'); 
	element.style.height = `${element.scrollHeight}px`;
}
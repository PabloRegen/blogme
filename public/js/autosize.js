
document.addEventListener('DOMContentLoaded', event => {
	Array.from(document.querySelectorAll('.autosize')).forEach(element => {
		autoSize(element);
		element.addEventListener('input', () => {
			autoSize(element);
		});
	});
});

function autoSize(element) {
	element.style.height = (element.name==='body' ? '600px' : '40px'); 
	element.style.height = `${element.scrollHeight}px`;
}
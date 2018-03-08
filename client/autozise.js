document.querySelector("textarea.autosize").addEventListener("oninput", autoSize);

function autoSize(element) {
	element.style.height = (element.name==='body' ? '600px' : '40px'); 
	element.style.height = `${element.scrollHeight}px`;
}
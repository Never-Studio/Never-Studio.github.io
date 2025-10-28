function switchToGerman() {
  const path = window.location.pathname;
  if (!path.startsWith('/de')) {
	window.location.href = '/de' + path;
  }
}
function switchToEnglish() {
  const path = window.location.pathname;
  if (path.startsWith('/de')) {
	window.location.href = path.replace("/de","");
  }
}


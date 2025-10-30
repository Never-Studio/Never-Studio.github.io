function showMessage(text, delay = 2000) {
  let toast = document.createElement("div");
  toast.textContent = text;
  toast.style = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    color: black;
    padding: 0.5em 1em;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0,0,0,0.2);
    z-index: 10000;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), delay);
}

var non_existent_de = ["tutorials/webagent/webuse-post.html"]
var non_existent_en = []

function canSwitchDe(path){
  let impossible = false;

  for(let p of non_existent_de){
    if(path.includes(p)) impossible = true;
  }

  return !impossible
}

function canSwitchEn(path){
  let impossible = false;

  for(let p of non_existent_en){
    if(path.includes(p)) impossible = true;
  }

  return !impossible
}

function switchToGerman() {
  const path = window.location.pathname;

  if(!canSwitchDe(path)){
    showMessage("This page is only available in English!");
    return;
  }
  
  if (!path.startsWith('/de')) {
	  window.location.href = '/de' + path;
  }
}
function switchToEnglish() {
  const path = window.location.pathname;

  if(!canSwitchEn(path)){
    showMessage("Diese Seite ist nur auf Deutsch verfügbar!");
    return;
  }

  if (path.startsWith('/de')) {
	window.location.href = path.replace("/de","");
  }
}


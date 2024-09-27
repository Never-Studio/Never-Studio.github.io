// Add smooth scrolling to all links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Add fade-in effect to sections on scroll
const sections = document.querySelectorAll('.full-height-section');

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.intersectionRatio >= 0.5) {
            entry.target.classList.add('visible');
        } /*else {
            entry.target.classList.remove('visible');
        }*/
    });
}, { threshold: 0.5 }); // Changed from 0.1 to 0.5

sections.forEach(section => observer.observe(section));

var notifications = [["Planned: Never World","An infinite ai generated world."],
		     ["Working on: Never RPG","A pixel rpg with currently limited access."],
		     ["Working on: Never Isometric Engine","The engine behind Never RPG. <br> It will be public and free to use. <br> Coming soon!"]
		   ]

function buttonizer(dict){
	let buttons = ""
	if(dict != undefined){
		buttons += '<br><p style= "white-space: nowrap;">'
		for(i of Object.keys(dict)){
		buttons += ' <a href="'+dict[i]+'"><button class = "black-button" style="display: inline !important;">'+i+'</button></a>'
		}
		buttons += "</p>"
	}
	return buttons
}
// Adjust viewport height for mobile devices
function adjustViewportHeight() {
	var notContainer =	document.getElementById("notification-container")	
	notContainer.innerHTML = ""
	for(let i= 0; i< notifications.length; i++){
		notContainer.innerHTML += `<div class="notification-item"><h3>${notifications[i][0]}</h3>  ${notifications[i][1]}${buttonizer(notifications[i][2])} </div>`
	}
	const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

window.addEventListener('resize', adjustViewportHeight);
adjustViewportHeight();

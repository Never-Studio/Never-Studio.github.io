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

var projects = [["Never Isometric Engine","It is currently under development...","bild-icon.png"],
		["Never RPG 1","Also currently under development ...","bild-icon.png"]
		]

function buttonizer(dict){
	let buttons = ""
	if(dict != undefined){
		buttons += '<br><p style= "white-space: nowrap;">'
		for(i of Object.keys(dict)){
		buttons += ' <a href="'+dict[i]+'"><button class = "white-button" style="display: inline !important;">'+i+'</button></a>'
		}
		buttons += "</p>"
	}
	return buttons
}
// Adjust viewport height for mobile devices
function adjustViewportHeight() {
    var projDiv = document.getElementById("work-grid")
    projDiv.innerHTML = ""
	for(let i=0; i< projects.length; i++){
		projDiv.innerHTML += `<div class="work-item"><div><h3> ${projects[i][0]} </h3> ${projects[i][1]}${buttonizer(projects[i][3])} </div><img src="${projects[i][2]}" alt="Project 1"></div>`;
	}
	
	
	const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

window.addEventListener('resize', adjustViewportHeight);
adjustViewportHeight();

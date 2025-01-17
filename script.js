// Add smooth scrolling to all links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});


function buttonizer(dict,color="white"){
	let buttons = ""
	if(dict != undefined){
		buttons += '<br><p style= "white-space: nowrap;">'
		for(i of Object.keys(dict)){
		buttons += ' <a href="'+dict[i]+'"><button class = "'+color+'-button" style="display: inline !important; margin: 15px;">'+i+'</button></a>'
		}
		buttons += "</p>"
	}
	return buttons
}			

function breaks(text){
	if(text.match(/<br>/g) != null){
		return (text.match(/<br>/g)).length
	}else{
		return 0
	}
	
}

function adjustContainers(){
	if (navigator.userAgent.match(/Android/i)
         || navigator.userAgent.match(/webOS/i)
         || navigator.userAgent.match(/iPhone/i)
         || navigator.userAgent.match(/iPad/i)
         || navigator.userAgent.match(/iPod/i)
         || navigator.userAgent.match(/BlackBerry/i)
         || navigator.userAgent.match(/Windows Phone/i)){
		var notContainer =	document.getElementById("notification-container")	
		notContainer.innerHTML = ""		
		let cost = 0;
		let i = 0;
		while(window.innerHeight-500>cost){
			if(i<notifications.length){
				notContainer.innerHTML += `<div class="notification-item"><h3>${notifications[i][0]}</h3>  ${notifications[i][1]}${buttonizer(notifications[i][2],"black")} </div>`
				cost += 300*(breaks(notifications[i][0])+2+breaks(notifications[i][1]))
			}else{break;}
			i++;
		}
		
		var projDiv = document.getElementById("work-grid")
		projDiv.innerHTML = ""
		for(let i=0; i< Math.min((window.innerHeight-500)/500,projects.length); i++){
			projDiv.innerHTML += `<a href="${projects[i][3]}" title="The background image shows: ${projects[i][4]}" style ="text-decoration: none !important;background-image: url("`+projects[i][2]+`");"><div class="work-item"><div><h3> ${projects[i][0]} </h3> </div></div></a>`;
		}
		
	}else{
		var notContainer =	document.getElementById("notification-container")	
		notContainer.innerHTML = ""		
		let cost = 0;
		let i = 0;
		while(window.innerHeight-350>cost){
			if(i<notifications.length){
				notContainer.innerHTML += `<div class="notification-item"><h3>${notifications[i][0]}</h3>  ${notifications[i][1]}${buttonizer(notifications[i][2],"black")} </div>`
				cost += 100*(breaks(notifications[i][0])+2+breaks(notifications[i][1]))
			}else{break;}
			i++;
		}
		
		var projDiv = document.getElementById("work-grid")
		projDiv.innerHTML = ""
		for(let i=0; i< Math.min((window.innerHeight-400)/210,projects.length); i++){
			projDiv.innerHTML += `<a href="${projects[i][3]}" title="The background image shows: ${projects[i][4]}" style ="text-decoration: none !important;background-image: url("${projects[i][2]}");"><div class="work-item"><div><h3> ${projects[i][0]} </h3> </div></div></a>`;
		}
	}
}


// Adjust viewport height for mobile devices
function adjustViewportHeight() {
	adjustContainers()
	const vh = window.innerHeight * 0.01;
	document.documentElement.style.setProperty('--vh', `${vh}px`);
}

window.addEventListener('resize', adjustViewportHeight);
adjustViewportHeight();

document.getElementById('scroll-down-arrow').addEventListener('click', function() {
    const nextSection = document.querySelector('#description-section');
    nextSection.scrollIntoView({ behavior: 'smooth' });
});

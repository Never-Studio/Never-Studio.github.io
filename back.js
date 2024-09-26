var back = document.getElementById("mainmenu")
window.onscroll = function(e) {
	// print "false" if direction is down and "true" if up
	if(this.oldScroll < this.scrollY && this.scrollY > 30){
		back.style.visibility = "hidden";
	}else if(this.oldScroll > this.scrollY){
		back.style.visibility = "visible";
	}
	this.oldScroll = this.scrollY;
}

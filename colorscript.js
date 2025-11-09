let bcolors = ["#E34234","#4d673a","#5F92EC","#ff8c00"];

if(window.matchMedia('(forced-colors: active)').matches || window.matchMedia('prefers-contrast: more').matches){
    bcolors = ["#EC6F65", "#77A262", "#6396EE", "#FF8C00"];

    var all = document.getElementsByTagName("*");

    for (var i=0, max=all.length; i < max; i++) {
        all[i].style.color = "black";
    }
}

var backgroundC = bcolors[Math.floor(Math.random()*bcolors.length)];
document.body.style.backgroundColor = backgroundC;


//white #AC2216 #485F35 #1553BC #8A4500
//black #EC6F65 #77A262 #6396EE #FF8C00
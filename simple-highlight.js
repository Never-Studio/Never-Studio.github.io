setTimeout(()=>{let codes = document.querySelectorAll("pre code")
let colors = {"blue":["function","let","const","return","if"],
	"orange":[new RegExp('".*?"'),new RegExp("'.*?'")]}
for(let code of codes){
	for(let color in colors){
		for(let pattern	of colors[color]){
			let found = new Set(code.innerText.match(pattern))
			for(let res of found){
				console.log(code.innerHTML)
				console.log(res)
				code.innerHTML = code.innerHTML.replaceAll(res,'<span style="color:'+color+';">'+res+'</span>')
			}
		}
	}
}},10);

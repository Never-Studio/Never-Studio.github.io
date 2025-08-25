var canvas = undefined;
var ctx = undefined;
var pixelated = false;
var ratio = 1/3
var m_x = 1/Math.sqrt(1+ratio*ratio)
var m_y = 1/Math.sqrt(1+1/(ratio*ratio))
var normWidth = undefined;
var normHeight = undefined;

window.addEventListener("resize",resizeCanvas);

function resizeCanvas(){
	if(normWidth!= undefined&&normHeight!=undefined){
		console.error("Set either nWidth or nHeight in setCanvas. Not both.\nHere are the specific docs: http://www.neverstudio.de/neverisometric.html#:~:text=There%20are%20nWidth")
	}else if(normWidth){
		canvas.height = normWidth * canvas.clientHeight/canvas.clientWidth
		canvas.width = normWidth;
	}else if(normHeight){
		canvas.width = normHeight * canvas.clientWidth/canvas.clientHeight;
		canvas.height = normHeight;
	}
}

function setCanvas(canvasId,pixelized=false,full=false,nWidth = undefined,nHeight = 500){
	normWidth = nWidth;
	normHeight = nHeight;
	canvas = document.getElementById(canvasId);

	if(full){
		canvas.style.setProperty("width","100vw");
		canvas.style.setProperty("height","100vh");
		canvas.style.setProperty("position","absolute");
		canvas.style.setProperty("top","0px");
		canvas.style.setProperty("left","0px");
	}
	if(pixelized){
		pixelated = true;
		canvas.style.setProperty("image-rendering","pixelated")
	}
	ctx = document.getElementById(canvasId).getContext("2d");
	resizeCanvas();
}

 function setRatio(newRatio){
	ratio = newRatio
	m_x = 1/Math.sqrt(1+ratio*ratio)
	m_y = 1/Math.sqrt(1+1/(ratio*ratio))
}

 function random(min,max){
	return min+Math.random()*(max-min)
}

function line(x1,y1,x2,y2,color){
	ctx.beginPath();
	ctx.moveTo(x1,y1);
	ctx.lineTo(x2,y2);
	ctx.stroke();
}

 function isoLine(x1,y1,x2,y2,z1=0,z2=0,color="black",width = 5){
	let start = toScreen(x1,y1,z1)
	let end = toScreen(x2,y2,z2)
	ctx.beginPath();
	ctx.moveTo(start[0],start[1]);
	ctx.lineTo(end[0],end[1]);
	ctx.strokeStyle = color;
	ctx.lineWidth = width;
	ctx.stroke();
}
 function toScreen(isoX,isoY,isoZ=0){
	screenX = (isoY-isoX)*m_x + canvas.width/2
	screenY = (isoY+isoX)*m_y - isoZ + canvas.height/2
	return [screenX,screenY]
}

 function toIso(screenX,screenY,isoZ=0){
	screenY = screenY+isoZ
	screenX = screenX - canvas.width/2
	screenY = screenY - canvas.height/2
	isoX = (screenY/m_y - screenX/m_x)/2
	isoY = (screenX/m_x + screenY/m_y)/2
	return [isoX , isoY]
}

function drawImage(image,width,height,x,y,z=0,canvas= canvas, imgOffset = [0,0]){
	let pos = toScreen(x,y,z)
	let ctx = canvas.getContext("2d");
	if(pixelated){
		ctx.drawImage(image, Math.round(pos[0]-width/2 +imgOffset[0]),Math.round(pos[1]-height +imgOffset[1]),width,height);
	}else{
		ctx.drawImage(image, pos[0]-width/2 +imgOffset[0],pos[1]-height+imgOffset[1],width,height);
	}
}
function toDeg(a){
	for(let i = 0;i < a.length;i++){
		a[i] = a[i]* (180 / Math.PI)
	}
	return a
}

function toRad(a){
	for(let i = 0;i < a.length;i++){
		a[i] = a[i]* (Math.PI/180)
	}
	return a
}

function angleDistance(a,b){
	first_dist = (Math.sin(a[0])-Math.sin(b[0]))**2+(Math.cos(a[0])-Math.cos(b[0]))**2
	second_dist = (Math.sin(a[1])-Math.sin(b[1]))**2+(Math.cos(a[1])-Math.cos(b[1]))**2
	return first_dist+second_dist
}

function turnCoor(coors,angles,relative=[0,0,0]){
	angles = toRad(angles)
	coors[0] = coors[0]-relative[0]
	coors[1] = coors[1]-relative[1]
	coors[2] = coors[2]-relative[2]
	let radius = Math.sqrt(coors[0]**2+coors[1]**2+coors[2]**2)
	let alpha = Math.acos(coors[2]/radius) + angles[0]
	let beta = Math.atan2(coors[1],coors[0]) + angles[1]
	let newCoor = []
	newCoor[0] = Math.round(radius*Math.sin(alpha)*Math.cos(beta))
	newCoor[1] = Math.round(radius*Math.sin(alpha)*Math.sin(beta))
	newCoor[2] = Math.round(radius*Math.cos(alpha))
	return newCoor
}

/*The field function shows a field of lines that are parallel to the isometric x and y axis.
It can be used to visualize different ratio values.*/
 function grid(minimum = -1000,maximum = 1000, steps=10){
	for(let x=minimum; x<maximum;x+=steps){
		isoLine(x,minimum,x,maximum)
	}
	for(let y = minimum; y<maximum;y+=steps){
		isoLine(minimum,y,maximum,y)	
	}
}

 class IsoObject{
	turnBounding(){
		let Xs = []
		let Ys = []
		let Zs = []
		for(let xCoor of [this.bounding[0][0],this.bounding[1][0]]){
			for(let yCoor of [this.bounding[0][1],this.bounding[1][1]]){
				for(let zCoor of [this.bounding[0][2],this.bounding[1][2]]){
					let new_ = turnCoor([xCoor,yCoor,zCoor],[this.aTurn,this.bTurn])
					Xs.push(new_[0])
					Ys.push(new_[1])
					Zs.push(new_[2])
				}
			}
		}
		this.turnedBounding = []
		this.turnedBounding[0] = [Math.min(...Xs),Math.min(...Ys),Math.min(...Zs)]
		this.turnedBounding[1] = [Math.max(...Xs),Math.max(...Ys),Math.max(...Zs)]
	}
	update(){
		if(this.turnBoundingBool){
			this.turnBounding()
		}
		this.minX = this.x+this.turnedBounding[0][0]
		this.minY = this.y+this.turnedBounding[0][1]
		this.maxX = this.x+this.turnedBounding[1][0]
		this.maxY = this.y+this.turnedBounding[1][1]
		this.minZ = this.z+this.turnedBounding[0][2]
		this.maxZ = this.z+this.turnedBounding[1][2]
		let startDist = angleDistance(this.turnMap[this.turnIndex]["angle"],[this.aTurn,this.bTurn])
		if(this.turnMap!=undefined){
			for(let i of Object.keys(this.turnMap)){
				let elementDist = angleDistance(this.turnMap[i]["angle"],[this.aTurn,this.bTurn]);
				if(elementDist<=startDist){
					startDist = elementDist;
					this.turnIndex = i;
				}
			}
		}else{console.log("No turnMap")}
		this.activeImage = this.turnMap[this.turnIndex]["imgs"][this.animationIndex]
		if(this.world.images[this.activeImage]){
			if(!this.dimDefined){
				if(this.world != undefined){
					this.width = this.world.images[this.activeImage].naturalWidth
					this.height = this.world.images[this.activeImage].naturalHeight
				}
			}
			if(this.offsetMap.hasOwnProperty(this.activeImage)){
				this.imgChange = this.offsetMap[this.activeImage]
			}else{
				this.imgChange = this.offsetMap["default"]
			}
		}
	}
	
	constructor(x,y,z,bounding,images,width=undefined,height=undefined,collision=undefined,screen=false){
		if(screen){
			[x,y] = toIso(x,y,z)
		}
		this.offsetMap = {"default":[0,0]}
		this.imgChange = [0,0]
		this.x = x
		this.y = y
		this.z = z
		this.hasCollision = true;
		this.bounding = bounding
		this.img = images
		this.activeImage = images[0]
		this.dimDefined = (width!=undefined&&height!=undefined)
		this.width = this.width
		this.height = this.height
		this.aTurn = 0;
		this.bTurn = 0;
		this.turnBoundingBool = false;
		this.turnedBounding = bounding
		this.turnMap = {"start":{"angle":[0,0,0],"imgs":images}}
		this.turnIndex = Object.keys(this.turnMap)[0]
		this.animationIndex = 0
		//display settings
		//set in the add function of the world
		//set them yourself to change the object appearance
		this.displayBox = undefined;
		this.displayShadow = undefined;
		this.displayImage = undefined;
		this.collision = collision;
		this.protectedProps = ["x","y","z","turnMap","bounding","img","turnIndex"]
		this.update()
	}
	
	turn(aTurn,bTurn,draw=true){
		let oldA = this.aTurn
		let oldB = this.aTurn
		this.aTurn = (aTurn+this.aTurn)%360;
		this.bTurn = (this.bTurn+bTurn)%360;
		this.update()
		if(this.colliding() != undefined){
			this.aTurn = oldA
			this.bTurn = oldB
			this.update()
			return false
		}else{
			if(draw){
				this.world.draw()
			}
			return true
		}
		
	}
	
	turnTo(aTurn,bTurn,draw=true){
		this.aTurn = (aTurn)%360;
		this.bTurn = (bTurn)%360;
		this.update()
		if(draw){
			this.world.draw()
		}
	}
	
	
	move(xchange,ychange,zchange=0,draw=true){
		this.x += xchange
		this.y += ychange
		this.z += zchange
		this.update()
		if(this.colliding() != undefined){
			this.x -= xchange
			this.y -= ychange
			this.z -= zchange
			this.update()
			return false
		}else{
			if(draw){
				this.world.draw()
			}
			return true
		}
		
		
	}
	
	moveForward(amount,draw=true){
		let radAngles = toRad([this.aTurn,this.bTurn])
		let newCoor = []
		newCoor[0] = amount*Math.sin(radAngles[1])
		newCoor[1] = amount*Math.cos(radAngles[1])
		newCoor = toIso(newCoor[0],newCoor[1])
		newCoor[0] -= toIso(0,0)[0]
		newCoor[1] -= toIso(0,0)[1]
		this.x += newCoor[0]
		this.y += newCoor[1]
		this.update()
		if(this.colliding() != undefined){
			this.x -= newCoor[0]
			this.y -= newCoor[1]
			this.update()
			return false
		}else{
			if(draw){
				this.world.draw()
			}
			return true
		}
		
		
	}
	
	moveTo(newx,newy,newz=0,draw=true){
		this.x = newx
		this.y = newy
		this.z = newz
		this.update()
		if(draw){
			this.world.draw()
		}
	}
	animationStep(step,this_){
		for(let i of Object.keys(this_)){
			if(this_.protectedProps.includes(i)){
				if(step.hasOwnProperty(i)){
					console.warn('Accesing "'+i+'" in an animation is not recommended: \n - Remove it from the IsoObjects protectedProps list to use it \n - Use "move":[xChange,yChange,zChange] if you want to move the object with collision. ')
				}
			}else{
				if(step.hasOwnProperty("add_"+String(i))){
					if(Array.isArray(step["add_"+String(i)])){
						if(step["add_"+String(i)].length != this_[i].length){
							throw new Error('Arrays that should be animated must be of the same length!\n'+step[i]+'.length != '+this_[i]+'.length');
						}else{
							for(let k=0; k < this_[i].length; k++){
								this_[i][k] += step["add_"+String(i)][k]
							}
						}
					}else{
						this_[i] += step["add_"+String(i)]
					}
				}
				if(step.hasOwnProperty("mult_"+String(i))){
					if(Array.isArray(step["mult_"+String(i)])){
						if(step["mult_"+String(i)].length != this_[i].length){
							throw new Error('Arrays that should be animated must be of the same length!\n '+step[i]+'.length != '+this_[i]+'.length');
						}else{
							for(let k=0; k < this_[i].length; k++){
								this_[i][k] += step["mult_"+String(i)][k]
							}
						}
					}else{
						this_[i] += step["mult_"+String(i)]
					}
				}
				if(step.hasOwnProperty(i)){
					this_[i] = step[i]
				}
				if(step.hasOwnProperty("func_"+String(i))){
					this_[i] = step["func_"+String(i)](this_[i])
				}
			}
		}
		if(step.hasOwnProperty("move")){
			this_.move(step["move"][0],step["move"][1],step["move"][2])
		}
		if(step.hasOwnProperty("moveForward")){
			this_.moveForward(step["moveForward"])
		}
		this_.update()
		this_.world.draw()
	}
	
	animate(animation,min,max,steps=500){
		/*animations have the following format:
		 * {"0":{ //second
		 * 		"move":[10,0,0] //event
		 * 		"displayBox":true;
		 * 		},
		 *  "10":{
		 * 		"move":[10,0,0]
		 * 		}
		 *  "20":{
		 * 		"move":[10,0,0]
		 * 		"func_displayBox":(data)=>{return !data}
		 * 		}
		 * }
		 */
		
		for(let i of Object.keys(animation)){
			if(i == "all"){
				for(let timestep = min;timestep<max;timestep+=steps){
					window.setTimeout(this.animationStep,timestep,animation["all"],this)
				}
				
			}else if(i == "resetPos"){
				window.setTimeout((this_,pos)=>{this_.moveTo(pos[0],pos[1],pos[2])},min+max,this,[this.x,this.y,this.z])
			}else{
				window.setTimeout(this.animationStep,min+(max-min)/100*parseInt(i),animation[i],this)
			}
			
		}
	}
	drop(){
		while(this.collide()==undefined && this.z >= 0){
			this.z -= 3
			this.update()
		}
		this.update()
	}
	draw(image,offset=[0,0,0]){
		this.update()
		if(this.displayImage){
			drawImage(image,this.width,this.height,this.x-offset[0],this.y-offset[1],this.z-offset[2],this.world.canvas, this.imgChange)
		}
		
		if(this.displayShadow){
			ctx.strokeStyle = "red"
			this.update()
			isoLine(this.minX-offset[0],this.minY-offset[1],this.minX-offset[0],this.maxY-offset[1])
			isoLine(this.maxX-offset[0],this.minY-offset[1],this.maxX-offset[0],this.maxY-offset[1])
			isoLine(this.minX-offset[0],this.minY-offset[1],this.maxX-offset[0],this.minY-offset[1])
			isoLine(this.minX-offset[0],this.maxY-offset[1],this.maxX-offset[0],this.maxY-offset[1])
			
		}
		if(this.displayBox){
			ctx.strokeStyle = "black"
			//unteres Viereck
			isoLine(this.minX-offset[0],this.minY-offset[1],this.minX-offset[0],this.maxY-offset[1],this.minZ-offset[2],this.minZ-offset[2])
			isoLine(this.maxX-offset[0],this.minY-offset[1],this.maxX-offset[0],this.maxY-offset[1],this.minZ-offset[2],this.minZ-offset[2])
			isoLine(this.minX-offset[0],this.minY-offset[1],this.maxX-offset[0],this.minY-offset[1],this.minZ-offset[2],this.minZ-offset[2])
			isoLine(this.minX-offset[0],this.maxY-offset[1],this.maxX-offset[0],this.maxY-offset[1],this.minZ-offset[2],this.minZ-offset[2])
			
			//mittlere Verbindungen
			isoLine(this.minX-offset[0],this.minY-offset[1],this.minX-offset[0],this.minY-offset[1],this.minZ,this.maxZ-offset[2])
			isoLine(this.maxX-offset[0],this.minY-offset[1],this.maxX-offset[0],this.minY-offset[1],this.minZ,this.maxZ-offset[2])
			isoLine(this.maxX-offset[0],this.maxY-offset[1],this.maxX-offset[0],this.maxY-offset[1],this.minZ,this.maxZ-offset[2])
			isoLine(this.minX-offset[0],this.maxY-offset[1],this.minX-offset[0],this.maxY-offset[1],this.minZ,this.maxZ-offset[2])
			
			//oberes Viereck
			isoLine(this.minX-offset[0],this.minY-offset[1],this.minX-offset[0],this.maxY-offset[1],this.maxZ-offset[2],this.maxZ-offset[2])
			isoLine(this.maxX-offset[0],this.minY-offset[1],this.maxX-offset[0],this.maxY-offset[1],this.maxZ-offset[2],this.maxZ-offset[2])
			isoLine(this.minX-offset[0],this.minY-offset[1],this.maxX-offset[0],this.minY-offset[1],this.maxZ-offset[2],this.maxZ-offset[2])
			isoLine(this.minX-offset[0],this.maxY-offset[1],this.maxX-offset[0],this.maxY-offset[1],this.maxZ-offset[2],this.maxZ-offset[2])
		}
		
	}
	
	
	
	collide(other){
		if(other==this){
			return false
		}
		if(!(other.maxZ<this.minZ)&&!(other.minZ>this.maxZ)){
			if(!(other.maxX<this.minX)&&!(other.minX>this.maxX)){
				if(!(other.maxY<this.minY)&&!(other.minY>this.maxY)){
					if(this.collision != undefined){
						if(this.collision.length==2){
							this.collision(this,other)
						}else{
							this.collision()
						}
						
					}
					if(other.collision != undefined){
						if(other.collision.length==2){
							other.collision(other,this)
						}else{
							other.collision()
						}
						
					}
					return true
				}
			}
		}
		return false
	}
	
	
	layering(other){
		if(this.minZ>other.maxZ){
			return 1
		}
		else if(other.minZ>this.maxZ){
			return -1
		}
		if(this.minX>other.maxX){
			return 1
		}
		else if(other.minX>this.maxX){
			return -1
		}
		if(this.minY>other.maxY){
			return 1
		}
		else if(other.minY>this.maxY){
			return -1
		}
		/*
		// If they are colliding:
		if(this.minZ>other.maxZ){
			return 1
		}
		else if(other.maxZ>this.maxZ){
			return -1
		}
		if(this.maxX>other.maxX){
			return 1
		}
		else if(other.maxX>this.maxX){
			return -1
		}
		if(this.maxY>other.maxY){
			return 1
		}
		else if(other.maxY>this.maxY){
			return -1
		}*/
	}
	
	colliding(world=this.world){
		if(!this.hasCollision){return undefined}
		if(world != undefined){
			let collided = undefined;
			for(let i of world.objects){
				if(i.hasCollision){
					if(this.collide(i)){
						collided = i;
						break;
					}
				}
			}
			return collided
		}else{
			console.warn("World is undefined! This does not have to be a problem but it might be.")
			return undefined
		}
	}
}

class World{
	constructor(canvas,keyobject = undefined){
		this.canvas = document.getElementById(canvas);
		this.ctx = this.canvas.getContext('2d')
		this.objects = []
		this.keyObject = keyobject
		this.keysPressed = {"up":0,"down":0,"left":0,"right":0}
		this.smartMovement = false
		this.detail = 10
		this.images = {}
		//display settings
		this.displayBox = false;
		this.displayShadow = false;
		this.displayImage = true;
		this.mousePos = [0,0]
		this.hasWall = false;
		this.wallBorders = [[-100,-100,0],[100,100,100]]
		
		window.addEventListener("resize",()=>{this.draw()});
		this.canvas.addEventListener("click",(e) => {
			let rect = this.canvas.getBoundingClientRect();
			let result = toIso(e.clientX - rect.left,e.clientY - rect.top)
			if(this.centerObject != undefined){
				this.mousePos[0] = result[0]+this.centerObject.x/this.centerR
				this.mousePos[1] = result[1]+this.centerObject.y/this.centerR
			}else{
				this.mousePos = result;
			}
		})
	}
	
	add(object,func = (obj)=>{console.log(obj,"loaded");}){
		this.objects.push(object)
		object.world = this
		object.displayBox = this.displayBox;
		object.displayShadow = this.displayShadow;
		object.displayImage = this.displayImage;
		for(let i of object.img){
			this.images[i] = new Image();
			this.images[i].src = i
			this.images[i].addEventListener("load",
				function() {
					func(this.src)
					object.world.draw()
				}
			);
		}
		
	}
	
	loadImage(img,func = (obj)=>{console.log(obj,"loaded");}){
			this.images[img] = new Image();
			this.images[img].src = img
			this.images[img].addEventListener("load",
				function() {
					func(this.src)
				}
			);
	}
	
	remove(delObjekt){
		this.objects = this.objects.filter(function (objekt) {return objekt !== delObjekt;});
	}
	
	keyhandler(key){
		if(this.keysPressed["up"]==1){
			
			if(this.smartMovement){
				this.move(this.keyObject,0,-10)
				this.move(this.keyObject,-10,0)
			}else{
				this.move(this.keyObject,-10,-10)
			}
		}if(this.keysPressed["down"]==1){
			if(this.smartMovement){
				this.move(this.keyObject,0,10)
				this.move(this.keyObject,10,0)
			}else{
				this.move(this.keyObject,10,10)
			}
		}if(this.keysPressed["left"]==1){
			if(this.smartMovement){
				this.move(this.keyObject,10,0)
				this.move(this.keyObject,0,-10)
			}else{
				this.move(this.keyObject,10,-10)
			}
		}if(this.keysPressed["right"]==1){
			if(this.smartMovement){
				this.move(this.keyObject,0,10)
				this.move(this.keyObject,-10,0)
			}else{
				this.move(this.keyObject,-10,10)
			}
		}
		this.draw()
	}
	
	setKeyObject(object){
		this.keyObject = object
		
		document.addEventListener("keydown",(keypress)=> {
			let key = keypress.key
			if(key=="ArrowUp"||key=="w"){
				this.keysPressed["up"] = 1
			}if(key=="ArrowDown"||key=="s"){
				this.keysPressed["down"] = 1
			}if(key=="ArrowLeft"||key=="a"){
				this.keysPressed["left"] = 1
			}if(key=="ArrowRight"||key=="d"){
				this.keysPressed["right"] = 1
			}
			this.keyhandler()
		})
		
		document.addEventListener("keyup",(keypress)=> {
				this.keysPressed["up"] = 0
				this.keysPressed["down"] = 0
				this.keysPressed["left"] = 0
				this.keysPressed["right"] = 0
		})
	}
	
	move(object,xchange,ychange,zchange=0){
			for(let i = 0; i< this.detail;i++){
				object.move(xchange/this.detail,ychange/this.detail,zchange/this.detail)
			}
	}
	
	
	
	center(object,ratio=1){
		this.centerObject = object;
		this.centerR = ratio
	}
	
	draw(clear=true){
		if(clear){this.ctx.clearRect(0, 0, this.canvas.width, canvas.height);}
		for(let i of this.objects.sort((a,b) => {return a.layering(b);})){
			if(this.centerObject != undefined){
				i.draw(this.images[i.activeImage],[this.centerObject.x/this.centerR,this.centerObject.y/this.centerR,0])
			}else{
				i.draw(this.images[i.activeImage])
			}
			
		}
	}
}
		

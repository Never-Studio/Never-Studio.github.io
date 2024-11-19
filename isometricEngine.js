var canvas = undefined;
var ctx = undefined;
var ratio = 1/3
var m_x = 1/Math.sqrt(1+ratio*ratio)
var m_y = 1/Math.sqrt(1+1/(ratio*ratio))

function setCanvas(canvasId){
	canvas = document.getElementById(canvasId);
	ctx = document.getElementById(canvasId).getContext("2d");
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

function drawImage(image,width,height,x,y,z=0,canvas= canvas){
	let pos = toScreen(x,y,z)
	let ctx = canvas.getContext("2d");
	ctx.drawImage(image, pos[0]-width/2,pos[1]-height,width,height);
	
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
	update(){
		this.minX = this.x+this.bounding[0][0]
		this.minY = this.y+this.bounding[0][1]
		this.maxX = this.x+this.bounding[1][0]
		this.maxY = this.y+this.bounding[1][1]
		this.minZ = this.z+this.bounding[0][2]
		this.maxZ = this.z+this.bounding[1][2]
		//console.log([this.minX,this.maxX,this.minY,this.maxY,this.minZ,this.maxZ])
		let distance = Math.sqrt(this.xTurn**2+this.yTurn**2+this.zTurn**2);
		if(this.turnMap!=undefined){
			for(let i of Object.keys(this.turnMap)){
				let elementDist = Math.sqrt((this.xTurn-this.turnMap[i][0])**2+(this.yTurn-this.turnMap[i][1])**2+(this.zTurn-this.turnMap[i][2])**2);
				if(elementDist<distance){
					distance = elementDist;
					this.activeImage = i;
				}
			}
		}else{console.log("No turnMap")}
	}
	
	constructor(x,y,z,bounding,images,width=undefined,height=undefined,collision=undefined,screen=false){
		if(screen){
			[x,y] = toIso(x,y,z)
		}
		this.x = x
		this.y = y
		this.z = z
		this.hasCollision = true;
		this.bounding = bounding
		this.img = images
		this.activeImage = images[0]
		this.update()
		this.width = this.width||Math.abs(toScreen(this.minX,this.maxY)[0]-toScreen(this.maxX,this.minY)[0])
		this.height = this.height||this.maxZ-this.minZ
		this.xTurn = 0;
		this.yTurn = 0;
		this.zTurn = 0;
		this.turnMap = {}
		//display settings
		//set in the add function of the world
		//set them yourself to change the object appearance
		this.displayBox = undefined;
		this.displayShadow = undefined;
		this.displayImage = undefined;
		this.collision = collision;
	}
	
	turn(xTurn,yTurn,zTurn=0){
		this.xTurn = (xTurn+this.xTurn)%360;
		this.yTurn = (this.yTurn+yTurn)%360;
		this.zTurn = (this.zTurn+ zTurn)%360;
		this.update()
	}
	
	
	move(xchange,ychange,zchange=0){
		this.x += xchange
		this.y += ychange
		this.z += zchange
		this.update()
		if(this.colliding() != undefined){
			this.x -= xchange
			this.y -= ychange
			this.z -= zchange
		}
		this.update()
	}
	
	moveTo(newx,newy,newz=0){
		this.x = newx
		this.y = newy
		this.z = newz
		this.update()
	}
	
	drop(){
		while(this.collide()==undefined && this.z >= 0){
			this.z -= 3
			this.update()
		}
		this.update()
	}
	draw(image,offset=[0,0,0]){
		if(this.displayImage){
			drawImage(image,this.width,this.height,this.x-offset[0],this.y-offset[1],this.z-offset[2],this.world.canvas)
		}
		
		if(this.displayShadow){
			this.update()
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
			console.log("World is undefined! This does not have to be a problem but it might be.")
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
	
	add(object,func= (obj)=>{console.log(obj,"loaded");}){
		this.objects.push(object)
		object.world = this
		object.displayBox = this.displayBox;
		object.displayShadow = this.displayShadow;
		object.displayImage = this.displayImage;
		for(let i of object.img){
			this.images[i] = new Image();
			this.images[i].src = i
			addEventListener("load", () => {
				func(i)
			});
		}
		
	}
	
	remove(delObjekt){
		this.objects = this.objects.filter(function (objekt) {return objekt !== delObjekt;});
	}
	
	setKeyObject(object,keyRate=100){
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
		})
		
		document.addEventListener("keyup",(keypress)=> {
			let key = keypress.key
			if(key=="ArrowUp"||key=="w"){
				this.keysPressed["up"] = 0
			}if(key=="ArrowDown"||key=="s"){
				this.keysPressed["down"] = 0
			}if(key=="ArrowLeft"||key=="a"){
				this.keysPressed["left"] = 0
			}if(key=="ArrowRight"||key=="d"){
				this.keysPressed["right"] = 0
			}
		})
		
		window.setInterval(()=>{this.keyhandler()},keyRate)
	}
	
	move(object,xchange,ychange,zchange=0){
			for(let i = 0; i< this.detail;i++){
				object.move(xchange/this.detail,ychange/this.detail,zchange/this.detail)
			}
	}
	
	keyhandler(key){
		if(this.keysPressed["up"]==1){
			this.draw()
			if(this.smartMovement){
				this.move(this.keyObject,0,-10)
				this.move(this.keyObject,-10,0)
			}else{
				this.move(this.keyObject,-10,-10)
			}
		}if(this.keysPressed["down"]==1){
			this.draw()
			if(this.smartMovement){
				this.move(this.keyObject,0,10)
				this.move(this.keyObject,10,0)
			}else{
				this.move(this.keyObject,10,10)
			}
		}if(this.keysPressed["left"]==1){
			this.draw()
			if(this.smartMovement){
				this.move(this.keyObject,10,0)
				this.move(this.keyObject,0,-10)
			}else{
				this.move(this.keyObject,10,-10)
			}
		}if(this.keysPressed["right"]==1){
			this.draw()
			if(this.smartMovement){
				this.move(this.keyObject,0,10)
				this.move(this.keyObject,-10,0)
			}else{
				this.move(this.keyObject,-10,10)
			}
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
		

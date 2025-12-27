var line_canvas = document.getElementById("canvas");

var table = document.getElementById("results");

var trainToggle = document.getElementById("train-toggle");

var datasetSelect = document.getElementById("datasets-select");

var weightRandomButton = document.getElementById("randomize");

var explainElement0 = document.getElementById("explain");
var explainElement1 = document.getElementById("explain1");
var explainElement2 = document.getElementById("explain2");

var canvasPos = [0,0];
var onCanvas = false;

let sideLength = window.innerWidth/3;
line_canvas.width = sideLength;
line_canvas.height = sideLength;

var line_ctx = canvas.getContext('2d');

var mode = "manual";

var curr_dataset;

class Perceptron{
    constructor(){
        this.weights = [0,0,0];
        this.eta = 0.05;
        this.randomize();
    }

    randomize(){
        this.weights = [Math.random()-0.5,Math.random()-0.5,Math.random()-0.5]
    }

    f_akt(val){
        if(val == 0) return 0.5
        if(val > 0) return 1
        return 0
    }

    sum(inputs){
        if(inputs.length == (this.weights.length -1)){
            inputs.unshift(1);
        }
        let sum = 0;

        for(let i=0; i < this.weights.length; i++){
            sum += inputs[i] * this.weights[i];
        }

        return sum;
    }

    feedForward(inputs){
        
        let sum = this.sum(inputs)

        return this.f_akt(sum);
    }

    getGraph(){
        let c = -this.weights[0]/this.weights[2]; // bias/w_2
        let m = -this.weights[1]/this.weights[2];

        if(this.weights[2] == 0){
            let large_num = 1e10;
            c = -this.weights[0] * large_num; // bias/w_2
            m = -this.weights[1] * large_num;
        }

        let upside;

        if(this.feedForward([0,c + 0.1]) > 0.9){
            upside = true;
        }else{
            upside = false;
        }

        return [c, m, upside]
    }

    train(sample){
        let input = sample[0];
        let d_result = sample[1];

        let result = this.feedForward(input);

        for(let i = 0; i < this.weights.length; i++){
            let delta_w = input[i] * (d_result - result) * this.eta;
            this.weights[i] += delta_w;
        }
    }
}


function round(num, digit, pad = true){
    let f;
    
    if(num < 0){
        f = Math.pow(10,digit-1);
    }else{
        f = Math.pow(10,digit);
    }

    let str = String(Math.round(num * f)/f)

    if(pad){
        if(str.includes(".")){
            return str.padEnd(digit+2,'0')
        }else{
            return str.padStart(digit+2,'0'); //' ').replaceAll(' ','&nbsp;') to pad with spaces in monospace font
        }
    }else{
        return str;
    }
}

function fillTable(p){
    let inputs = [0,0,0];

    for (var i = 0, row; row = table.rows[i]; i++) {
        if(i == 0) continue;
        for (var j = 0, col; col = row.cells[j]; j++) {
            if(j < 3){
                inputs[j] = parseFloat(col.innerHTML)
            }

            if(j == 3){
                let res = p.feedForward(inputs);
                col.innerHTML = res;

                for(let choice of curr_dataset){
                    if(inputs.every((element, index) => parseInt(element * 10) == parseInt(choice[0][index] * 10))){
                        if(res == choice[1]){
                            col.style.backgroundColor = "lightgreen";
                        }else{
                            col.style.backgroundColor = "red";
                        }
                    }
                }
                
            }
        }  
    }
}

function fillInputs(p, which = "all"){
    for(let i=0; i < 3; i++){
        if(which == "all"){
            document.getElementById("input_w_"+i).value = p.weights[i]
            document.getElementById("slider_w_"+i).value = p.weights[i]
        }else{
            if(which == "sliders"){
                document.getElementById("slider_w_"+i).value = p.weights[i]
            }else if(which == "inputs"){
                document.getElementById("input_w_"+i).value = p.weights[i]
            }
        }
        
    }
}

function listenForInputs(p){
    line_canvas.addEventListener('mousemove', (event) => {
        onCanvas = true;
        let rect = line_canvas.getBoundingClientRect();
        let x = event.clientX - rect.left;
        let y = event.clientY - rect.top;
        canvasPos = [x,y];
        

    });

    line_canvas.addEventListener("mouseleave", (event) => {
        onCanvas = false;
    })

    for(let i=0; i < 3; i++){

        document.getElementById("input_w_"+i).addEventListener('input', (event)=>{
            if(Number.isNaN(parseFloat(event.target.value))) return;
            p.weights[i] = parseFloat(event.target.value);

            if(mode == "train"){
                trainToggle.innerHTML = "train"
                mode = "manual";
                alert("stopped training")
            }

            fillInputs(p, "sliders");
        });

        document.getElementById("slider_w_"+i).addEventListener('input', (event)=>{
            if(Number.isNaN(parseFloat(event.target.value))) return;
            p.weights[i] = parseFloat(event.target.value);

            if(mode == "train"){
                trainToggle.innerHTML = "train"
                mode = "manual";
                alert("stopped training")
            }

            fillInputs(p, "inputs");
        });
    }

    trainToggle.addEventListener("click", (event) => {
            if(mode == "train"){
                event.target.innerHTML = "train"
                mode = "manual";
            }else{
                mode = "train";
                event.target.innerHTML = "stop training"
            }
    });

    datasetSelect.addEventListener("change", (event) => {
        selectDataset(event.target.value);
    });

    weightRandomButton.addEventListener("click", (event) => {
        p.randomize();
        fillInputs(p);
    });
}

function drawBackground(){
    line_ctx.fillStyle = "red";
    line_ctx.fillRect(0,0,line_canvas.width, line_canvas.height);
}


function drawAnnotations(){
    if(onCanvas){
        let x = canvasPos[0];
        let y = canvasPos[1];

        inputs = [x/line_canvas.height,1-y/line_canvas.height];

        let res = p.feedForward(inputs);

        if(res > 0.9){
            line_ctx.beginPath();
            line_ctx.arc(x, y, 5, 0, 2 * Math.PI);
            line_ctx.fillStyle = "green";
            line_ctx.fill();
        }else{
            line_ctx.beginPath();
            line_ctx.arc(x, y, 5, 0, 2 * Math.PI);
            line_ctx.fillStyle = "red";
            line_ctx.fill();
        }

        line_ctx.fillStyle = "white";

        line_ctx.beginPath();
        line_ctx.arc(x, y, 6, 0, 2 * Math.PI);
        line_ctx.strokeStyle = "white";
        line_ctx.stroke();

        line_ctx.fillText("("+round(inputs[1],3)+", "+round(inputs[2] ,3)+") = "+round(res ,3), x + 10, y + 2.5);
    }
    

   

    

    
    
    line_ctx.fillStyle = "white";
    
    //left
    line_ctx.fillText("(0, 1)", 0, 10);
    line_ctx.fillText("(0, 0)", 0, line_canvas.height - 5);

    //right
    line_ctx.fillText("(1, 1)", line_canvas.width - 25, 10);
    line_ctx.fillText("(1, 0)", line_canvas.width - 25, line_canvas.height - 5);

    //annotate x-axis
    line_ctx.fillText("x_1", line_canvas.width /2 , line_canvas.height - 5);

    //annotate y-axis
    line_ctx.fillText("x_2", 0 , line_canvas.height/2);
}

function fillGraph(c, m, upside){
    c *= line_canvas.height;

    line_ctx.fillStyle = "green";

    line_ctx.beginPath();
    line_ctx.moveTo(0, line_canvas.height - c);
    line_ctx.lineTo(line_canvas.width, line_canvas.height -  (c + line_canvas.width * m));
    
    if(upside){
        if((c + line_canvas.width * m) < line_canvas.height){
            line_ctx.lineTo(line_canvas.width, 0);//upper right corner
        }

        if(c < line_canvas.height){//upper left corner
            line_ctx.lineTo(0, 0);
        }

        

    }else{
        if((c + line_canvas.width * m) > 0){
            line_ctx.lineTo(line_canvas.width, line_canvas.height);//lower right corner
        }

        if(c > 0){//lower left corner
            line_ctx.lineTo(0, line_canvas.height);
        }

        
    }
        
    line_ctx.closePath();
    line_ctx.fill();
}

function fillExplanation(p){
    if(onCanvas){
        let x = canvasPos[0];
        let y = canvasPos[1];

        inputs = [x/line_canvas.height,1-y/line_canvas.height];

        text = "";

        text += '<span class="formula">1</span> &middot; <span class="formula">'+round(p.weights[0],3)+'</span>' 
        text += '<br>+<br>'
        text += '<span class="formula">'+round(inputs[0],3)+'</span> &middot; <span class="formula">'+round(p.weights[1],3)+'</span>' 
        text += '<br>+<br>'
        text += '<span class="formula">'+round(inputs[1],3)+'</span> &middot; <span class="formula">'+round(p.weights[2],3)+'</span>'

        explainElement0.innerHTML = text;

        explainElement1.innerHTML = round(p.sum(inputs),3);

        explainElement2.innerHTML = "&nbsp;=&nbsp;"+round(p.feedForward(inputs),4,false);


    }else{
        text = "";

        text += '<span class="formula">1</span> &middot; <span class="formula">'+round(p.weights[0],3)+'</span>' 
        text += '<br>+<br>'
        text += '<span class="formula">x<sub>1</sub></span> &middot; <span class="formula">'+round(p.weights[1],3)+'</span>' 
        text += '<br>+<br>'
        text += '<span class="formula">x<sub>2</sub></span> &middot; <span class="formula">'+round(p.weights[2],3)+'</span>'

        explainElement0.innerHTML = text;
        explainElement1.innerHTML = "net";
        explainElement2.innerHTML = "";
    }
    
}

let p = new Perceptron();

function fillCanvas(){
    drawBackground();

    let graph = p.getGraph();

    fillGraph(...graph);
    drawAnnotations();
}

let train_data_and = [
    [[1,0,0],0],
    [[1,0,1],0],
    [[1,1,0],0],
    [[1,1,1],1],
]

let train_data_or = [
    [[1,0,0],0],
    [[1,0,1],1],
    [[1,1,0],1],
    [[1,1,1],1],
]

let train_data_xor = [
    [[1,0,0],0],
    [[1,0,1],1],
    [[1,1,0],1],
    [[1,1,1],0],
]

function selectDataset(dataset){
    let allDatasetNames = ["and","or","xor"]

    switch(dataset){
        case "and":
            curr_dataset = train_data_and;
            break;
        case "or":
            curr_dataset = train_data_or;
            break;
        case "xor":
            curr_dataset = train_data_xor;
            break;
        case "random":
            selectDataset(drawRandom(allDatasetNames));
            return;
    }

    datasetSelect.value = dataset;
}

function drawRandom(arr){
    return arr[Math.floor(Math.random() * arr.length)];
}



function loop(){
    if(mode == "train"){
        p.train(drawRandom(curr_dataset));
        fillInputs(p);
    }

    fillCanvas();
    fillTable(p);
    fillExplanation(p);
}

selectDataset("and");
window.setInterval(loop, 16);
fillInputs(p);
listenForInputs(p);

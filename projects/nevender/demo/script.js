import * as THREE from "three";

import { fillScene, animateScene } from "./tests/sceneLoader.js";

import { preproccess } from "./nevender/index.js";

import Stats from "./stats.js/src/stats.js";

const SCENE = 4;

const renderer = new THREE.WebGLRenderer();
renderer.setClearColor("grey");
renderer.setSize(window.innerWidth / 2 - 10, window.innerHeight - 1);
document.body.append(renderer.domElement);

renderer.domElement.style.display = "inline";

const rendererStatic = new THREE.WebGLRenderer();
rendererStatic.setClearColor("grey");
rendererStatic.setSize(window.innerWidth / 2 - 10, window.innerHeight - 1);
document.body.append(rendererStatic.domElement);

rendererStatic.domElement.style.display = "inline";

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  90,
  window.innerWidth / 2 / window.innerHeight,
  0.1,
  1000,
);

const cameraStatic = new THREE.PerspectiveCamera(
  100,
  window.innerWidth / 2 / window.innerHeight,
  0.1,
  1000,
);

camera.position.set(0, 0, document.getElementById("distance-slider").value);

let threshold = document.getElementById("threshold-slider").value;

document
  .getElementById("distance-slider")
  .addEventListener("input", (event) => {
    camera.position.z = event.target.value;
  });

document
  .getElementById("threshold-slider")
  .addEventListener("input", (event) => {
    threshold = event.target.value;
  });

scene.add(camera);
scene.add(cameraStatic);

const objects = await fillScene(scene, SCENE);

const wireframeMat = new THREE.ShaderMaterial({
    uniforms: {
    },
    
    vertexShader: `
        flat varying int vPos;
        
        void main() {
            vPos = gl_VertexID;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
    `,

    fragmentShader: `
        flat varying int vPos;
        void main()
        {
            gl_FragColor = vec4(vec3(float(vPos % 7)/ 7., float(vPos % 3)/ 3., float(vPos % 9)/ 9.),1.0);
        }
    `
});

objects[0].material = wireframeMat

preproccess.processMesh(objects[0]);

preproccess.visualize(objects[0], document.getElementById("dag-canvas"));

//Stats
const panel = new Stats({ renderer: renderer });

for (let i = 0; i < 7; i++) {
  panel.showPanel(i); // 0: fps, 1: ms, 2: mb, 3+: custom

  document.body.appendChild(panel.dom);
  panel.dom.style.position = "absolute";
  panel.dom.style.top = "0px";
}

function render() {
  panel.begin();

  preproccess.chooseMesh(objects[0], camera, threshold);

  animateScene(scene, SCENE);
  //occlusionCulling(renderer,scene, camera);

  renderer.render(scene, camera);
  rendererStatic.render(scene, cameraStatic);

  panel.end();

  window.requestAnimationFrame(render);
}

window.requestAnimationFrame(render);

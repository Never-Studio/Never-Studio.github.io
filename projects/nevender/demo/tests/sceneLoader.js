import * as THREE from "three";

import { GLTFLoader } from "/three/examples/jsm/Addons.js";

const WIREFRAME = false;
const SIDE = THREE.DoubleSide;
const OPACITY = 1;




function applyAllTransforms(mesh) {
  mesh.updateMatrix();
  mesh.geometry.applyMatrix4(mesh.matrix);

  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  mesh.scale.set(1, 1, 1);
  mesh.updateMatrix();
}

const testFuncs = [];
async function fillScene(scene, number) {
  return await testFuncs[number](scene);
}

function animateScene(scene, number) {
  if (number !== 2) {
    animateSceneAll(scene);
  }
}

function animateSceneAll(scene) {
  scene.traverse((c) => {
    if (c.isMesh) {
      //c.rotation.y += 0.01;
    }
  });
}

async function fillScene0(scene) {
  const light = new THREE.AmbientLight("#ffffff", 1);

  scene.add(light);

  const objects = [];

  let dim = 13;
  let res = 128;
  let res2 = 64;

  const geo = new THREE.SphereGeometry(dim, res, res2);
  const mat = new THREE.MeshStandardMaterial({
    wireframe: WIREFRAME,
    color: "white",
    vertexColors: true,
    side: SIDE,
    transparent: OPACITY == 1 ? false : true,
    opacity: OPACITY,
  });

  const mesh = new THREE.Mesh(geo, mat);

  mesh.position.set(0, 0, -10);

  scene.add(mesh);

  objects.push(mesh);

  return objects;
}

testFuncs.push(fillScene0);

async function fillScene1(scene) {
  const light = new THREE.AmbientLight("#ffffff", 1);

  scene.add(light);

  const objects = [];

  let dim = 13;
  let res = 3;
  let res2 = 100;
  let res3 = 16;

  const geo = new THREE.TorusKnotGeometry(dim, res, res2, res3);
  const mat = new THREE.MeshStandardMaterial({
    wireframe: WIREFRAME,
    color: "white",
    vertexColors: true,
    side: SIDE,
    transparent: OPACITY == 1 ? false : true,
    opacity: OPACITY,
  });

  const mesh = new THREE.Mesh(geo, mat);

  mesh.position.set(0, 0, -10);

  scene.add(mesh);

  objects.push(mesh);

  return objects;
}
testFuncs.push(fillScene1);

async function fillScene2(scene) {
  //huge crowded scene
  const light = new THREE.DirectionalLight("white", 100);
  light.position.set(100, 1000, 10);

  const helper = new THREE.Object3D();
  helper.position.set(0, 0, 0);

  light.target = helper;

  scene.add(light);

  const colors = ["red", "blue", "green", "orange"];

  const objects = [];

  for (let i = 0; i < 5000; i++) {
    let dim = Math.random() * 1 + 0.2;
    let res = 20;

    const geo = new THREE.SphereGeometry(dim, res, res);
    const mat = new THREE.MeshStandardMaterial({
      wireframe: WIREFRAME,
      color: colors[Math.floor(Math.random() * colors.length)],
      side: SIDE,
      transparent: OPACITY == 1 ? false : true,
      opacity: OPACITY,
    });

    const mesh = new THREE.Mesh(geo, mat);

    mesh.position.set(
      100 * Math.random() - 50,
      80 * Math.random() - 40,
      -i / 6 - 30,
    );

    scene.add(mesh);

    objects.push(mesh);
  }

  return objects;
}
testFuncs.push(fillScene2);

async function fillScene3(scene) {
  //gltf model scene
  const light = new THREE.AmbientLight("#ffffff", 1);

  scene.add(light);

  const objects = [];

  let loader = new GLTFLoader();

  const gltf = await loader.loadAsync("tests/models/DragonAttenuation.gltf");

  const mesh = gltf.scene.children[1];

  /*
  mesh.material = new THREE.MeshStandardMaterial({
    wireframe: WIREFRAME,
    color: "white",
    vertexColors: true,
    side: SIDE,
    transparent: OPACITY == 1 ? false : true,
    opacity: OPACITY,
  });
 */

  mesh.material.wireframe = WIREFRAME;

  mesh.scale.set(3, 3, 3);

  applyAllTransforms(mesh);

  mesh.position.set(0, -8, -20);

  scene.add(mesh);

  objects.push(mesh);

  return objects;
}
testFuncs.push(fillScene3);

async function fillScene4(scene) {
  //gltf model scene
  const light = new THREE.AmbientLight("#ffffff", 1);

  scene.add(light);

  const objects = [];

  let loader = new GLTFLoader();

  const gltf = await loader.loadAsync("tests/models/StanfordBunny.gltf");

  const mesh = gltf.scene.children[0].children[0];

  mesh.material = new THREE.MeshBasicMaterial({
    wireframe: WIREFRAME,
    color: "white",
    vertexColors: true,
    side: SIDE,
    transparent: OPACITY == 1 ? false : true,
    opacity: OPACITY,
  });

  mesh.scale.set(100, 100, 100);

  applyAllTransforms(mesh);

  mesh.position.set(0, -10, -10);

  scene.add(mesh);

  objects.push(mesh);

  return objects;
}
testFuncs.push(fillScene4);

async function fillScene5(scene) {
  //gltf model scene
  const light = new THREE.AmbientLight("#ffffff", 1);

  scene.add(light);

  const objects = [];

  let loader = new GLTFLoader();

  const gltf = await loader.loadAsync("tests/models/suzanne.gltf");

  console.log(gltf.scene);

  const mesh = gltf.scene.children[0].children[0];

  mesh.material = new THREE.MeshStandardMaterial({
    wireframe: WIREFRAME,
    color: "white",
    vertexColors: true,
    side: SIDE,
    transparent: OPACITY == 1 ? false : true,
    opacity: OPACITY,
  });

  mesh.scale.set(3, 3, 3);

  applyAllTransforms(mesh);

  mesh.position.set(0, -5, -10);

  scene.add(mesh);

  objects.push(mesh);

  return objects;
}
testFuncs.push(fillScene5);

async function fillScene6(scene) {
  //gltf model scene
  const light = new THREE.AmbientLight("#ffffff", 1);

  scene.add(light);

  const objects = [];

  let loader = new GLTFLoader();

  const gltf = await loader.loadAsync("tests/models/teapot.gltf");

  console.log(gltf.scene);

  const mesh = gltf.scene.children[0].children[0];

  mesh.material = new THREE.MeshStandardMaterial({
    wireframe: WIREFRAME,
    color: "white",
    vertexColors: true,
    side: SIDE,
    transparent: OPACITY == 1 ? false : true,
    opacity: OPACITY,
  });

  mesh.scale.set(3, 3, 3);

  applyAllTransforms(mesh);

  mesh.position.set(0, -5, -10);

  scene.add(mesh);

  objects.push(mesh);

  return objects;
}
testFuncs.push(fillScene6);

async function fillScene7(scene) {
  //gltf model scene
  const light = new THREE.AmbientLight("#ffffff", 1);

  scene.add(light);

  const objects = [];

  let loader = new GLTFLoader();

  const gltf = await loader.loadAsync("tests/models/StanfordBunnyMerged.gltf");

  const mesh = gltf.scene.children[0].children[0];

  mesh.material = new THREE.MeshStandardMaterial({
    wireframe: WIREFRAME,
    color: "white",
    vertexColors: true,
    side: SIDE,
    transparent: OPACITY == 1 ? false : true,
    opacity: OPACITY,
  });

  mesh.scale.set(100, 100, 100);

  applyAllTransforms(mesh);

  mesh.position.set(0, -10, -10);

  scene.add(mesh);

  objects.push(mesh);

  return objects;
}
testFuncs.push(fillScene7);

async function fillScene8(scene) {
  //gltf model scene
  const light = new THREE.AmbientLight("#ffffff", 1);

  scene.add(light);

  const objects = [];

  let loader = new GLTFLoader();

  const gltf = await loader.loadAsync("tests/models/meshlet.gltf");

  console.log(gltf);

  const mesh = gltf.scene.children[0];

  mesh.material = new THREE.MeshStandardMaterial({
    wireframe: WIREFRAME,
    color: "white",
    vertexColors: true,
    side: SIDE,
    transparent: OPACITY == 1 ? false : true,
    opacity: OPACITY,
  });

  mesh.scale.set(100, 100, 100);

  applyAllTransforms(mesh);

  mesh.position.set(0, -5, -10);

  scene.add(mesh);

  objects.push(mesh);

  return objects;
}
testFuncs.push(fillScene8);

async function fillScene9(scene) {
  //gltf model scene
  const light = new THREE.AmbientLight("#ffffff", 1);

  scene.add(light);

  const objects = [];

  let loader = new GLTFLoader();

  const gltf = await loader.loadAsync("tests/models/BoxVertexColors.gltf");

  console.log(gltf);

  const mesh = gltf.scene.children[0];

  mesh.material = new THREE.MeshStandardMaterial({
    wireframe: WIREFRAME,
    color: "white",
    vertexColors: true,
    side: SIDE,
    transparent: OPACITY == 1 ? false : true,
    opacity: OPACITY,
  });

  mesh.scale.set(100, 100, 100);

  applyAllTransforms(mesh);

  mesh.position.set(0, -5, -10);

  scene.add(mesh);

  objects.push(mesh);

  return objects;
}
testFuncs.push(fillScene9);

async function fillScene10(scene) {
  //gltf model scene
  const light = new THREE.AmbientLight("#ffffff", 1);

  scene.add(light);

  const objects = [];

  let loader = new GLTFLoader();

  const gltf = await loader.loadAsync("tests/models/DragonAttenuation.gltf");

  const mesh = gltf.scene.children[0];

  mesh.scale.set(3, 3, 3);

  applyAllTransforms(mesh);

  mesh.position.set(0, 0, -5);

  scene.add(mesh);

  objects.push(mesh);

  return objects;
}
testFuncs.push(fillScene10);

export { fillScene, animateScene };

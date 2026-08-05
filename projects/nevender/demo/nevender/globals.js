import * as THREE from "three";
import * as _BufferGeometryUtils from "/three/examples/jsm/utils/BufferGeometryUtils.js";

import { SimplifyModifier } from "./three-updates/SimplifyModifier2.js";
import { mergeVertices } from "./three-updates/mergeVertices2.js";

const BufferGeometryUtils = {
  ..._BufferGeometryUtils,
  mergeVertices,
};

export { THREE, BufferGeometryUtils, SimplifyModifier };

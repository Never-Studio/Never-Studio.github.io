import { THREE, BufferGeometryUtils, SimplifyModifier } from "./globals.js";
import { compressString, decompressString } from "./compression.js";
import { createCompute, renderCompute } from "./webgl-compute.js";

const DEBUG = true;
const ACCURACY_EXP = 2;

function normalizeGeometry(geometry, indexed = false) {
    if (!geometry.hasAttribute("position")) {
        console.error("Geometry missing position attribute");
        return;
    }

    if (geometry.attributes.position.isInterleavedBufferAttribute) {
        BufferGeometryUtils.deinterleaveGeometry(geometry);
    }

    if (indexed) {
        if (geometry.index == null) {
            //geometry.deleteAttribute();

            //if geometry is not indexed make it indexed to ensure the vertex have the same position

            geometry = BufferGeometryUtils.mergeVertices(
                geometry,
                10 ** -ACCURACY_EXP,
                ["normal", "meshlet", "uv", "color"],
            );
            geometry.computeVertexNormals();
        } else {
            if (DEBUG) console.warn("already indexed geometry");
        }
    } else {
        if (geometry.index != null) {
            geometry = geometry.toNonIndexed();
            geometry.computeVertexNormals();
        } else {
            if (DEBUG) console.warn("already non-indexed geometry");
        }
    }

    return geometry;
}

function meshletize(geometry, config = {}) {
    const MIN_TRIS = config["min"] ?? 20;
    const MAX_TRIS = config["max"] ?? 126;
    const OPTIMAL = config["optimal"] ?? true;
    const OFFSET = config["offset"] ?? 0;
    const ANNEX = config["annex"] ?? true;
    const RANDOM = config["random"] ?? true;
    const RANDOM_BORDERING = config["random-border"] ?? false;
    const MIN_GROUP = false;

    geometry = normalizeGeometry(geometry, false);

    let positions = geometry.getAttribute("position").array;

    const [triangleGraph, triangleEdges] = buildTriGraph(positions);
    //if more than one vertice is shared with a triangle the triangle index is negated and lowered by 1 -(t+1) to prevent ambiguity with 0

    const oldTriangleGraph = Object.fromEntries(
        Object.entries(triangleGraph).map(([k, v]) => [k, [...v]]),
    );

    let triNum = 0;
    let curMeshlet = OFFSET;
    const tri2meshlet = {};
    let meshletArr = [];
    let meshletArrs = {};
    let allFree = new Set(
        Object.keys(oldTriangleGraph).map((tri) => Number(tri)),
    );

    function randFreeTriangle() {
        let maxFree = 0;
        let maxFreeTri;

        for (let i of allFree) {
            if (
                tri2meshlet[i] == undefined &&
                triangleGraph[i].length >= maxFree
            ) {
                if (triangleGraph[i].length == maxFree) {
                    if (RANDOM && Math.random() > 0.8) {
                        maxFree = triangleGraph[i].length;
                        maxFreeTri = i;
                    }
                } else {
                    maxFree = triangleGraph[i].length;
                    maxFreeTri = i;
                }
            }
        }

        return maxFreeTri;
    }

    let curTri = randFreeTriangle();

    let generations = [[curTri]]; //a 2d array to store the generations of triangles, beginning with the first triangle and ending with the outer layer
    let curGen = 0;
    let curGenIndex = 0;

    let fillMeshlet;

    const meshletConnectedTris = {}; //to build meshlet connection dataset

    while (triNum < positions.length / 9) {
        curTri = generations[curGen][curGenIndex];

        if (curTri < 0) {
            console.warn("current triangle not decoded. Has value:", curTri);
        }

        if (tri2meshlet[curTri] == undefined) {
            //store triangle once and increase tri-score
            tri2meshlet[curTri] = curMeshlet;
            meshletArr.push(curTri);
            allFree.delete(curTri);
            triNum++;
        }

        let newTri;

        let minIndex;

        /*
    if (RANDOM_BORDERING) {
      if (triangleGraph[curTri].includes(undefined)) {
        minIndex = NaN;
      } else {
        triangleGraph[curTri] = triangleGraph[curTri].map((x) =>
          x == null ? 0 : x,
        );
        const negatives = triangleGraph[curTri].filter((x) => x < 0);

        if (negatives.length > 0) {
          minIndex = negatives[Math.floor(negatives.length * Math.random())];
        } else {
          minIndex =
            triangleGraph[curTri].length > 0
              ? triangleGraph[curTri][
                  Math.floor(triangleGraph[curTri].length * Math.random())
                ]
              : Infinity;
        }
      }
    }
    */

        //same code as above
        minIndex = Math.min.apply(Math, triangleGraph[curTri]);

        const minIndexNorm = Math.max(minIndex, -minIndex - 1);

        if (tri2meshlet[minIndexNorm] !== undefined) {
            // if current triangle has a meshlet
            triangleGraph[curTri] = triangleGraph[curTri].filter(
                (tri) => tri2meshlet[Math.max(tri, -tri - 1)] == undefined,
            ); //set connections in triangle graph to tris without meshlet
        }

        if (minIndex >= 0 || triangleGraph[curTri].length == 0) {
            //if theres only one connection to the triangle or there are no connections (leads to minIndex == Infinity)
            curGenIndex++; //move to next triangle

            if (curGenIndex >= generations[curGen].length) {
                //if current generation is overflowing/ending

                if (
                    generations[curGen + 1] == undefined ||
                    generations[curGen + 1]?.length === 0
                ) {
                    //if the next generation is empty

                    let chosenCurMeshlet = curMeshlet;

                    if (
                        triangleGraph[curTri].length == 0 ||
                        OPTIMAL ||
                        meshletArr.length >= MAX_TRIS
                    ) {
                        //and the current triangle doesnt have any connections switch to the next meshlet

                        if (meshletArr.length < MIN_TRIS && ANNEX) {
                            //and give all triangles of this meshlet to an adjacent meshlet if this meshlet is too small

                            let adjacentIndex = 0;
                            let adjacent;

                            const conns = oldTriangleGraph[curTri];

                            let minMeshlets = Infinity;
                            let minAdjacent;
                            let belowThreshold = false;

                            while (adjacentIndex < conns.length) {
                                let adjacentTri = conns[adjacentIndex];
                                adjacentTri = Math.max(
                                    adjacentTri,
                                    -adjacentTri - 1,
                                );

                                adjacent = tri2meshlet[adjacentTri];

                                if (adjacent == curMeshlet)
                                    adjacent = undefined;

                                if (minAdjacent == undefined) {
                                    minAdjacent = adjacent;
                                }

                                if (MIN_GROUP) {
                                    if (
                                        adjacent !== undefined &&
                                        meshletArrs[adjacent] !== undefined
                                    ) {
                                        if (!belowThreshold) {
                                            // if there is no number below the threshold search minimum
                                            if (
                                                meshletArrs[adjacent].length <
                                                minMeshlets
                                            ) {
                                                if (
                                                    meshletArrs[adjacent]
                                                        .length < MAX_TRIS
                                                )
                                                    belowThreshold = true;
                                                minAdjacent = adjacent;
                                                minMeshlets =
                                                    meshletArrs[adjacent]
                                                        .length;
                                            }
                                        } else {
                                            // if there is a number below threshold search maximum below threshold
                                            if (
                                                meshletArrs[adjacent].length >
                                                    minMeshlets &&
                                                meshletArrs[adjacent].length <
                                                    MAX_TRIS
                                            ) {
                                                minAdjacent = adjacent;
                                                minMeshlets =
                                                    meshletArrs[adjacent]
                                                        .length;
                                            }
                                        }
                                    }
                                } else {
                                    if (adjacent !== undefined) {
                                        minAdjacent = adjacent;
                                    }
                                }

                                adjacentIndex++;
                            }

                            if (minAdjacent == undefined) {
                                console.warn(
                                    "small meshlet with no connections.\n length of:",
                                    meshletArr.length,
                                );
                            } else {
                                for (let tri of meshletArr) {
                                    tri2meshlet[tri] = minAdjacent;
                                    meshletArrs[minAdjacent].push(tri);
                                }

                                chosenCurMeshlet = minAdjacent;
                                meshletArr = meshletArrs[minAdjacent];
                            }
                        }

                        for (let tri of meshletArr) {
                            //for all triangles of the current meshlet
                            const conns = oldTriangleGraph[tri];

                            for (let c of conns) {
                                if (c >= 0) continue; // if c is not an edge skip
                                const adjacentTri = -c - 1;

                                if (!meshletConnectedTris[chosenCurMeshlet])
                                    meshletConnectedTris[chosenCurMeshlet] =
                                        new Set();

                                if (
                                    tri2meshlet[adjacentTri] !==
                                        chosenCurMeshlet &&
                                    tri2meshlet[adjacentTri] !== undefined
                                ) {
                                    // fill all adjacent tris into the list of adjacent tris per meshlet
                                    if (
                                        !meshletConnectedTris[
                                            chosenCurMeshlet
                                        ].has(adjacentTri)
                                    )
                                        meshletConnectedTris[
                                            chosenCurMeshlet
                                        ].add(adjacentTri);

                                    if (
                                        !meshletConnectedTris[
                                            tri2meshlet[adjacentTri]
                                        ]
                                    )
                                        meshletConnectedTris[
                                            tri2meshlet[adjacentTri]
                                        ] = new Set();

                                    if (
                                        !meshletConnectedTris[
                                            tri2meshlet[adjacentTri]
                                        ].has(tri)
                                    )
                                        meshletConnectedTris[
                                            tri2meshlet[adjacentTri]
                                        ].add(tri);
                                }
                            }
                        }

                        meshletArrs[curMeshlet] = meshletArr;

                        curMeshlet++;
                        meshletArr = [];

                        let restartTriangle = randFreeTriangle();

                        if (restartTriangle == undefined) break;

                        generations = [[restartTriangle]];
                        curGen = 0;
                        curGenIndex = 0;
                    } else {
                        //if the current triangle has inoptimal connections add these and switch to next generation
                        generations[curGen + 1] = [minIndexNorm];

                        triangleGraph[curTri] = triangleGraph[curTri].filter(
                            (tri) => {
                                return (
                                    tri !== -minIndexNorm - 1 &&
                                    tri !== minIndexNorm
                                );
                            },
                        );

                        triangleGraph[minIndexNorm] = triangleGraph[
                            minIndexNorm
                        ].filter((tri) => {
                            return tri !== -curTri - 1 && tri !== curTri;
                        });

                        curGenIndex = 0;
                        curGen++;
                    }
                } else {
                    //if the next generation is not empty switch to next generation
                    curGenIndex = 0;
                    curGen++;
                }
            }
        } else if (meshletArr.length < MAX_TRIS) {
            //if there are two connections to the triangle and the meshlet is not full
            if (generations[curGen + 1] == undefined) {
                generations[curGen + 1] = [];
            }

            newTri = -minIndex - 1;

            if (tri2meshlet[newTri] == undefined) {
                if (!generations[curGen + 1].includes(newTri)) {
                    generations[curGen + 1].push(newTri);
                }
            }

            triangleGraph[curTri] = triangleGraph[curTri].filter((tri) => {
                return tri !== -newTri - 1 && tri !== newTri;
            });

            triangleGraph[newTri] = triangleGraph[newTri].filter((tri) => {
                return tri !== -curTri - 1 && tri !== curTri;
            });
        } else {
            //if there are two connections to the triangle and the meshlet is full

            if (meshletArr.length < MIN_TRIS) {
                console.error(
                    "meshlet too small, even though it should be larger than MAX_TRIS.\n length of:",
                    meshletArr.length,
                );
            }

            for (let tri of meshletArr) {
                //for all triangles of the current meshlet
                const conns = oldTriangleGraph[tri];

                for (let c of conns) {
                    if (c >= 0) continue; // if c is not an edge
                    const adjacentTri = -c - 1;

                    if (!meshletConnectedTris[curMeshlet])
                        meshletConnectedTris[curMeshlet] = new Set();

                    if (
                        tri2meshlet[adjacentTri] !== curMeshlet &&
                        tri2meshlet[adjacentTri] !== undefined
                    ) {
                        // fill all adjacent tris into the list of adjacent tris per meshlet
                        if (!meshletConnectedTris[curMeshlet].has(adjacentTri))
                            meshletConnectedTris[curMeshlet].add(adjacentTri);

                        if (!meshletConnectedTris[tri2meshlet[adjacentTri]])
                            meshletConnectedTris[tri2meshlet[adjacentTri]] =
                                new Set();

                        if (
                            !meshletConnectedTris[tri2meshlet[adjacentTri]].has(
                                tri,
                            )
                        )
                            meshletConnectedTris[tri2meshlet[adjacentTri]].add(
                                tri,
                            );
                    }
                }
            }

            meshletArrs[curMeshlet] = meshletArr;
            curMeshlet++;
            meshletArr = [];

            let restartTriangle = randFreeTriangle();

            if (restartTriangle == undefined) break;

            generations = [[restartTriangle]];
            curGen = 0;
            curGenIndex = 0;
        }
    }

    //build meshlet connection db

    const meshletConns = {}; //to store connected meshlets
    const meshletKeys = Object.keys(meshletConnectedTris);

    for (let meshlet of meshletKeys) {
        const numbers = {};

        for (let tri of meshletConnectedTris[meshlet].values()) {
            if (numbers[+tri2meshlet[tri] + 1] == undefined)
                numbers[+tri2meshlet[tri] + 1] = 0;

            numbers[+tri2meshlet[tri] + 1]++;
        }

        meshletConns[+meshlet + 1] = numbers;
    }

    const meshlets = new Int32Array(positions.length / 3);

    for (let i = 0; i < positions.length / 9; i++) {
        let meshlet = (tri2meshlet[i] ?? -1) + 1;

        if (meshlet == 0) {
            console.warn("vertex without meshlet");
        }

        if (meshletConns[meshlet] == undefined) meshletConns[meshlet] = {};

        meshlets[i * 3] = meshlets[i * 3 + 1] = meshlets[i * 3 + 2] = meshlet;
    }

    geometry.setAttribute(
        "meshlet",
        new THREE.BufferAttribute(new Int32Array(meshlets), 1),
    );

    return [geometry, meshletConns, triangleEdges];
}

function hash(vertex) {
    const PRECISION = 10 ** ACCURACY_EXP;

    return [
        Math.round(vertex[0] * PRECISION),
        Math.round(vertex[1] * PRECISION),
        Math.round(vertex[2] * PRECISION),
    ].join("|");
}

function buildTriGraph(positions) {
    const position2Triangle = {};
    const triangleGraph = {};

    const triangleEdgeNum = {};

    for (let i = 0; i < positions.length; i += 9) {
        const tri = [
            [positions[i], positions[i + 1], positions[i + 2]],
            [positions[i + 3], positions[i + 3 + 1], positions[i + 3 + 2]],
            [positions[i + 6], positions[i + 6 + 1], positions[i + 6 + 2]],
        ];

        const triNum = i / 9;

        for (let vertI = 0; vertI < 3; vertI++) {
            if (!position2Triangle[hash(tri[vertI])])
                position2Triangle[hash(tri[vertI])] = new Set();
            position2Triangle[hash(tri[vertI])].add(triNum);
        }
    }

    for (let i = 0; i < positions.length; i += 9) {
        const tri = [
            [positions[i], positions[i + 1], positions[i + 2]],
            [positions[i + 3], positions[i + 3 + 1], positions[i + 3 + 2]],
            [positions[i + 6], positions[i + 6 + 1], positions[i + 6 + 2]],
        ];

        const triNum = i / 9;

        triangleGraph[triNum] = new Set();

        if (
            position2Triangle[hash(tri[0])] ||
            position2Triangle[hash(tri[1])] ||
            position2Triangle[hash(tri[2])]
        ) {
            for (let vertI = 0; vertI < 3; vertI++) {
                if (position2Triangle[hash(tri[vertI])]) {
                    for (let t of position2Triangle[hash(tri[vertI])]) {
                        if (t == triNum || t == -triNum - 1) continue;

                        if (!triangleGraph[triNum].has(t)) {
                            triangleGraph[triNum].add(t);
                        } else {
                            triangleGraph[triNum].delete(t);
                            triangleGraph[triNum].add(-t - 1);

                            triangleEdgeNum[triNum] =
                                triangleEdgeNum[triNum] ?? 0;
                            triangleEdgeNum[triNum]++;
                        }
                    }
                }
            }
        }

        triangleGraph[triNum] = Array.from(triangleGraph[triNum]);
    }

    const triangleEdges = new Set();

    for (const tri in triangleEdgeNum) {
        if (triangleEdgeNum[tri] < 3) triangleEdges.add(tri); //if less than three double connections are registered,
        // the triangle is at the edge of the geometry and will be locked later
    }

    return [triangleGraph, triangleEdges];
}

function debugMeshlets(geometry) {
    geometry = normalizeGeometry(geometry, false);

    let meshlets = geometry.getAttribute("meshlet").array;
    let maxMeshlets = meshlets.reduce((a, b) => Math.max(a, b), -Infinity);

    const randColors = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
        [1, 1, 0],
        [0, 1, 1],
        [1, 0, 1],
        [1, 0.5, 0],
        [0.5, 1, 0],
        [0, 1, 0.5],
        [0, 0.5, 1],
        [0.5, 0, 1],
        [1, 0, 0.5],
        [1, 0.75, 0],
        [0.75, 1, 0],
        [0, 1, 0.75],
        [0, 0.75, 1],
        [0.75, 0, 1],
        [1, 0, 0.75],
        [0.5, 0.5, 0],
        [0, 0.5, 0.5],
        [0.5, 0, 0.5],
    ];
    const randColorsLen = randColors.length;
    const maxMeshletsSin = 77 / maxMeshlets;

    let colors = new Float32Array(meshlets.length * 3);

    for (let i = 0; i < meshlets.length; i++) {
        if (meshlets[i] == 0) {
            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = 1.0;
            colors[i * 3 + 2] = 1.0;
            continue;
        }

        let [r, g, b] = randColors[meshlets[i] % randColorsLen];
        let normalized = Math.max(
            (Math.sin(meshlets[i] * maxMeshletsSin) + 1) / 2,
            0.01,
        );

        colors[i * 3] = r * normalized;
        colors[i * 3 + 1] = g * normalized;
        colors[i * 3 + 2] = b * normalized;
    }

    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    return geometry;
}

function simplify(geometry, partial = 0.5) {
    /*
 ```geometry``` is the geometry to be simplified
 ```partial``` describes the percentage of total triangles to be removed
 */
    let g = geometry.clone();

    g = normalizeGeometry(g, true);

    const modifier = new SimplifyModifier();

    const vertexCount = g.getAttribute("position").count;

    const toRemove = Math.floor(vertexCount * partial);

    const simplified = modifier.modify(g, toRemove, ["meshlet"], {
        locked: true,
    });

    simplified.computeVertexNormals();

    return [simplified, modifier.error];
}

function splitMeshlets(geometry) {
    const positions = geometry.getAttribute("position").array;
    const meshletMask = geometry.getAttribute("meshlet").array;

    const meshlets = {};
    const meshletIds = new Set();
    const meshletData = {};

    for (let i = 0; i < positions.length / 3; i++) {
        const meshlet = meshletMask[i];

        meshletIds.add(meshlet);

        if (meshlets[meshlet] == undefined) meshlets[meshlet] = {};
        if (meshletData[meshlet] == undefined) meshletData[meshlet] = {};

        for (const [name, attr] of Object.entries(geometry.attributes)) {
            if (meshlets[meshlet][name] == undefined)
                meshlets[meshlet][name] = [];

            meshletData[meshlet][name + "_constructor"] =
                attr.array.constructor;
            meshletData[meshlet][name + "_size"] = attr.itemSize;

            for (let itemI = 0; itemI < attr.itemSize; itemI++) {
                meshlets[meshlet][name].push(
                    attr.array[i * attr.itemSize + itemI],
                );
            }
        }
    }

    const resultingGeometries = [];

    for (let id of meshletIds) {
        let groupGeometry = new THREE.BufferGeometry();

        for (const attr in meshlets[id]) {
            groupGeometry.setAttribute(
                attr,
                new THREE.BufferAttribute(
                    new meshletData[id][attr + "_constructor"](
                        meshlets[id][attr],
                    ),
                    meshletData[id][attr + "_size"],
                ),
            );
        }

        groupGeometry.meshlet = id;

        resultingGeometries.push(groupGeometry);
    }

    return resultingGeometries;
}

function groupMeshlets(geometry, meshletConns, config = {}) {
    const SIZE = config["size"] ?? 4;

    const _meshletConns = Object.fromEntries(
        Object.entries(meshletConns).map(([k, v]) => [k, { ...v }]),
    );

    const meshlets = {};
    const meshletData = {};
    let freeMeshlets = new Set();

    const positions = geometry.getAttribute("position").array;
    const meshletMask = geometry.getAttribute("meshlet").array;

    for (let i = 0; i < positions.length / 3; i++) {
        const meshlet = meshletMask[i];
        freeMeshlets.add(meshlet);

        if (meshlets[meshlet] == undefined) meshlets[meshlet] = {};
        if (meshletData[meshlet] == undefined) meshletData[meshlet] = {};

        for (const [name, attr] of Object.entries(geometry.attributes)) {
            if (meshlets[meshlet][name] == undefined)
                meshlets[meshlet][name] = [];

            meshletData[meshlet][name + "_constructor"] =
                attr.array.constructor;
            meshletData[meshlet][name + "_size"] = attr.itemSize;

            for (let itemI = 0; itemI < attr.itemSize; itemI++) {
                meshlets[meshlet][name].push(
                    attr.array[i * attr.itemSize + itemI],
                );
            }
        }
    }

    const meshlet2Group = {};
    const resultingGroups = [];

    let curGroup = 0;

    function getFree() {
        let maxConns = -Infinity;
        let maxConnected;

        for (let free of freeMeshlets) {
            let avgWeight = 0;
            let num = 0;

            for (let [meshlet, weight] of Object.entries(meshletConns[free])) {
                num++;
                avgWeight += weight;
            }

            avgWeight /= num;
            if (num == 0) avgWeight = 0; // should only be considered last

            if (avgWeight > maxConns) {
                maxConns = avgWeight;
                maxConnected = free;
            }
        }

        return maxConnected;
    }

    let curMeshlet = getFree(); //choose random meshlet
    freeMeshlets.delete(curMeshlet);

    meshlet2Group[curMeshlet] = curGroup;

    resultingGroups[curGroup] = [curMeshlet];

    while (freeMeshlets.size > 0) {
        if (resultingGroups[curGroup] == undefined)
            resultingGroups[curGroup] = [];

        groupLoop: while (resultingGroups[curGroup].length < SIZE) {
            let max = 0;
            let maxMeshlet;

            for (const [otherMeshlet, weight] of Object.entries(
                meshletConns[curMeshlet],
            )) {
                if (meshlet2Group[otherMeshlet] !== undefined) continue;

                if (weight > max) {
                    max = weight;
                    maxMeshlet = +otherMeshlet;
                }
            }

            let triedProxies = new Set();

            while (maxMeshlet == undefined) {
                // if no direct connection is available
                let maxProxy;
                max = 0;

                for (const [otherMeshlet, weight] of Object.entries(
                    _meshletConns[curMeshlet],
                )) {
                    // get most densely connected neighbor of old connections
                    if (
                        meshlet2Group[otherMeshlet] != curGroup ||
                        triedProxies.has(+otherMeshlet)
                    )
                        continue; // which is in the same group and not already tried as a proxy

                    if (weight > max) {
                        max = weight;
                        maxProxy = +otherMeshlet;
                    }
                }

                if (maxProxy == undefined) {
                    console.warn(
                        "no proxy for meshlet grouping.\naborting with size of",
                        resultingGroups[curGroup].length,
                    );
                    break groupLoop;
                } else {
                    max = 0;

                    for (const [otherMeshlet, weight] of Object.entries(
                        meshletConns[maxProxy],
                    )) {
                        if (meshlet2Group[otherMeshlet] !== undefined) continue;

                        if (weight > max) {
                            max = weight;
                            maxMeshlet = +otherMeshlet;
                        }
                    }

                    if (maxMeshlet == undefined) {
                        triedProxies.add(maxProxy);
                    }
                }
            }

            freeMeshlets.delete(maxMeshlet);
            meshlet2Group[maxMeshlet] = curGroup;
            resultingGroups[curGroup].push(maxMeshlet);

            delete meshletConns[curMeshlet][maxMeshlet]; // delete at least these two obsolete connections
            delete meshletConns[maxMeshlet][curMeshlet];
        }

        curGroup++;

        curMeshlet = getFree();
        freeMeshlets.delete(curMeshlet);

        if (curMeshlet === undefined) break;

        resultingGroups[curGroup] = [curMeshlet];
        meshlet2Group[curMeshlet] = curGroup;
    }

    let resultingGeometries = [];

    let checkedMeshlets;
    if (DEBUG) checkedMeshlets = new Set();

    for (const group of resultingGroups) {
        const combinedAttributes = {};

        const refMeshlet = meshletData[group[0]];

        for (const meshlet of group) {
            if (DEBUG) {
                if (checkedMeshlets.has(meshlet)) {
                    console.error("meshlet used twice in groups", meshlet);
                } else {
                    checkedMeshlets.add(meshlet);
                }
            }

            for (const attr in meshlets[meshlet]) {
                if (combinedAttributes[attr] == undefined)
                    combinedAttributes[attr] = [];

                combinedAttributes[attr].push(...meshlets[meshlet][attr]);
            }
        }

        let groupGeometry = new THREE.BufferGeometry();

        for (const attr in combinedAttributes) {
            groupGeometry.setAttribute(
                attr,
                new THREE.BufferAttribute(
                    new refMeshlet[attr + "_constructor"](
                        combinedAttributes[attr],
                    ),
                    refMeshlet[attr + "_size"],
                ),
            );
        }

        resultingGeometries.push(groupGeometry);
    }

    return [resultingGeometries, meshlet2Group];
}

function crossConnectMeshlets(allGroups, meshletConns, groupsEdges) {
    let vertex2Triangle = {};
    let tri2meshlet = {};
    let tri2vertices = {};

    let groupI = 0;
    let triOffset = 0;

    let checkedTriangles = new Set();

    for (let geo of allGroups) {
        const positions = geo.getAttribute("position").array;
        const meshletMask = geo.getAttribute("meshlet").array;

        //checkedTriangles.clear(); //check if its twice in the same group. with the current implementation no triangles occurs in the same group twice

        for (let triIndex of groupsEdges[groupI]) {
            const trid = +triIndex + triOffset;
            tri2meshlet[trid] = meshletMask[triIndex * 3];

            const vertexHashs = new Set();

            for (let vertexI = 0; vertexI < 3; vertexI++) {
                const vertexHash = hash([
                    positions[triIndex * 9 + vertexI * 3],
                    positions[triIndex * 9 + vertexI * 3 + 1],
                    positions[triIndex * 9 + vertexI * 3 + 2],
                ]);

                vertexHashs.add(vertexHash);
            }

            if (DEBUG) {
                const triangleKey = [...vertexHashs].join("#");
                if (checkedTriangles.has(triangleKey)) {
                    console.error(
                        "same triangle twice in different groups ",
                        triangleKey,
                    );
                    continue;
                }
                checkedTriangles.add(triangleKey);
            }

            tri2vertices[trid] = vertexHashs;

            const proccessedPairs = new Set();

            for (const vertexHash of vertexHashs) {
                vertex2Triangle[vertexHash] ??= new Set();
                vertex2Triangle[vertexHash].add(trid);

                for (const otherTrid of vertex2Triangle[vertexHash]) {
                    if (
                        otherTrid != trid &&
                        !proccessedPairs.has(trid + "|" + otherTrid) &&
                        tri2meshlet[otherTrid] !== tri2meshlet[trid]
                    ) {
                        proccessedPairs.add(trid + "|" + otherTrid);

                        let count = 0;

                        for (let vertex of tri2vertices[otherTrid]) {
                            if (vertexHashs.has(vertex)) {
                                count++;
                            }
                        }

                        if (count == 2) {
                            // if shared edge
                            meshletConns[tri2meshlet[otherTrid]][
                                tri2meshlet[trid]
                            ] ??= 0;
                            meshletConns[tri2meshlet[otherTrid]][
                                tri2meshlet[trid]
                            ]++;

                            meshletConns[tri2meshlet[trid]][
                                tri2meshlet[otherTrid]
                            ] ??= 0;
                            meshletConns[tri2meshlet[trid]][
                                tri2meshlet[otherTrid]
                            ]++;
                        } else if (count == 3) {
                            console.error("triangles are the same!");
                        }
                    }
                }
            }
        }

        triOffset += positions.length / 9 + 1;
        groupI++;
    }
}

function processMesh(mesh) {
    const repr = {};

    let geo = mesh.geometry;

    if (DEBUG) {
        console.log(mesh.geometry.attributes);
    }

    let maxSize = mesh.geometry.attributes.position.count;

    let DAG = [];

    /*
  - meshletize
  - split at meshlets
  - store leaves in graph
  - set children to leaves

  loop:
    - group into meshlet groups of size 4 with most shared edges and merge groups
    for each group:
      - simplify group
      - meshletize group
      - split at meshlets

      for each meshlet:
        - store meshlet in graph {children, current position attributes, meshlet, error, bsphere} and add to all parents parent.children
        - for all children set parent to the meshlet

      - set children to meshlets in group
  */

    /*
  {
    level: <level of the node>,

    group: <which parents group the node is part of>,

    parents: <array of its parents indices>,

    children: <array of its childrens indices>,

    position: <the position attributeY,

    meshlet: <the index of the node (called "meshlet" becauseevery node is one meshlet>,

    center: <the vec3 of the center in local coordinates as an array>,

    error: <the error caused by simplifying this specific node>,

    sumError: <the average error of the nodes before + this nodes error>,

    bsphere: <the bounding sphere (currently null),

  }
  */
    const attribute2index = { position: 0 };
    let attributeIndex = 1;
    const geometryPoolMap = {};
    const geometryPools = [[]];

    const indexArrays = (arrays) => {
        const newArray = [];

        for (let i = 0; i < arrays[0].length / 3; i++) {
            const key =
                arrays[0][i * 3] +
                "|" +
                arrays[0][i * 3 + 1] +
                "|" +
                arrays[0][i * 3 + 2];

            if (geometryPoolMap[key] === undefined) {
                geometryPoolMap[key] = geometryPools[0].length / 3;
                geometryPools[0].push(
                    arrays[0][i * 3],
                    arrays[0][i * 3 + 1],
                    arrays[0][i * 3 + 2],
                );

                //fill in other attributes
                for (let attr = 1; attr < arrays.length; attr++) {
                    if (arrays[attr] == undefined) continue;
                    geometryPools[attr] ??= [];

                    const itemSize =
                        arrays[attr].length / (arrays[0].length / 3);

                    for (let _ = 0; _ < itemSize; _++) {
                        geometryPools[attr].push(
                            arrays[attr][i * itemSize + _],
                        );
                    }
                }
            }

            newArray.push(geometryPoolMap[key]);
        }

        return newArray;
    };

    let levelI = 0;

    const meshletConfig = {
        min: 200,
        max: 256,
    };

    let meshletConns;

    [geo, meshletConns] = meshletize(geo, meshletConfig);

    let children = [];

    geo.computeBoundingSphere();
    const groupSphere = geo.boundingSphere;

    let splitted = splitMeshlets(geo);
    let groups;
    const middle = new THREE.Vector3();

    DAG.push([]);

    for (const leaf of splitted) {
        leaf.computeBoundingSphere();
        middle.copy(leaf.boundingSphere.center);

        let attributeArrays = [];

        for (const attr in leaf.attributes) {
            let i = attribute2index[attr];
            if (i == undefined) {
                attribute2index[attr] = attributeIndex;
                attributeIndex++;
                i = attribute2index[attr];
            }

            attributeArrays[i] = leaf.attributes[attr].array;
        }

        DAG[0].push({
            i: DAG[0].length,
            level: 0,
            group: null,
            parents: [],
            children: [],
            index: indexArrays(attributeArrays),
            meshlet: leaf.meshlet,
            center: middle.toArray(),
            error: 0,
            sumError: 0,
            bradius: groupSphere.radius,
        });
        children.push(DAG[0].length - 1);
    }

    levelI++;
    DAG.push([]);

    let minNumMeshlets = children.length;
    let minMeshletCount = 0;

    while (children.length > 1 && levelI < 200) {
        console.log(
            "computing level: ",
            levelI,
            "number of meshlet of last iteration: ",
            children.length,
        );

        const newChildren = [];
        let meshlet2Group;

        [groups, meshlet2Group] = groupMeshlets(geo, meshletConns, { size: 8 }); //returns array of merged meshlets

        console.log(
            "number of groups: ",
            groups.length,
            " vs. number of meshlets: ",
            children.length,
        );

        if (groups.length >= children.length) {
            console.warn("did not group");
            break;
        }

        let groupI = 0;
        let meshletOffset = 0;
        const allGroups = [];
        const groupsEdges = [];
        meshletConns = {};

        for (let group of groups) {
            let [groupMesh, error] = simplify(group, 0.5); // returns simplified group

            let groupMeshletConns;
            let triangleEdges;

            [groupMesh, groupMeshletConns, triangleEdges] = meshletize(
                groupMesh,
                {
                    ...meshletConfig,
                    offset: meshletOffset,
                },
            ); // meshletizes simplified group with offset of numer of already created meshlets

            groupsEdges.push(triangleEdges);

            const maxId = Object.keys(groupMeshletConns).reduce(
                function (p, v) {
                    // scales better to very alrge arrays
                    return p > v ? +p : +v;
                },
            );

            meshletOffset = Number(maxId) + 1;

            groupMesh.computeBoundingSphere();
            const groupSphere = groupMesh.boundingSphere;

            let splitted = splitMeshlets(groupMesh); // returns array of splitted mesh non-destrcutive

            const connectedChildren = children.filter(
                (c) => meshlet2Group[DAG[levelI - 1][c].meshlet] == groupI,
            );

            console.log("num children", connectedChildren.length);
            for (const meshlet of splitted) {
                meshlet.computeBoundingSphere();
                middle.copy(meshlet.boundingSphere.center);

                let errSum = 0;
                for (let child of connectedChildren) {
                    errSum += DAG[levelI - 1][child].sumError;
                }
                errSum /= connectedChildren.length;

                let attributeArrays = [];

                for (const attr in meshlet.attributes) {
                    let i = attribute2index[attr];
                    if (i == undefined) {
                        attribute2index[attr] = attributeIndex;
                        attributeIndex++;
                        i = attribute2index[attr];
                    }

                    attributeArrays[i] = meshlet.attributes[attr].array;
                }

                DAG[levelI].push({
                    i: DAG[levelI].length,
                    level: levelI,
                    group: groupI,
                    parents: [],
                    children: connectedChildren,
                    index: indexArrays(attributeArrays),
                    meshlet: meshlet.meshlet,
                    center: middle.toArray(),
                    error: error,
                    sumError: error + errSum,
                    bradius: groupSphere.radius,
                });
                newChildren.push(DAG[levelI].length - 1);

                for (let child of connectedChildren) {
                    DAG[levelI - 1][child].parents.push(DAG[levelI].length - 1);
                }
            }

            allGroups.push(groupMesh);

            groupI++;

            meshletConns = { ...meshletConns, ...groupMeshletConns };
        }

        levelI++;
        DAG.push([]);

        crossConnectMeshlets(allGroups, meshletConns, groupsEdges);

        geo = BufferGeometryUtils.mergeGeometries(allGroups);

        children = newChildren;

        if (children.length < minNumMeshlets) {
            minMeshletCount = 0;
            minNumMeshlets = children.length;
        } else {
            minMeshletCount++;

            if (minMeshletCount > 2) {
                console.log("groups: max simplification reached");
                break;
            }
        }
    }

    const MAX_POINTS = geometryPools[0].length / 3; //set to one time ax size once algorithm for DAG-cut works

    console.log("max size:", maxSize);

    const maxGeo = new THREE.BufferGeometry();

    for (let attr in geo.attributes) {
        const itemSize = geo.attributes[attr].itemSize;

        let arr;
        if (attribute2index[attr] !== undefined) {
            arr = new Float32Array(geometryPools[attribute2index[attr]]);
        } else {
            arr = new Float32Array(MAX_POINTS * itemSize);
        }

        maxGeo.setAttribute(attr, new THREE.BufferAttribute(arr, itemSize));
        maxGeo.getAttribute(attr).needsUpdate = true;
    }

    console.log("geometry pool", geometryPools);

    geo.dispose();

    let newIndex = [];

    for (let el of DAG[DAG.length - 1]) {
        newIndex.push(...el.index);
    }

    maxGeo.setIndex(newIndex);
    maxGeo.index.needsUpdate = true;

    if (DEBUG) {
        console.log(maxGeo.attributes);
    }

    mesh.geometry = maxGeo; //debugMeshlets(maxGeo);

    repr.oldDag = compressString(DAG);

    const groupify = (level, index) => {
        const newLevel = [];

        for (const el_ of level) {
            const el = { ...el_ };

            const group = el.group || 0;

            newLevel.length = Math.max(newLevel.length, group + 1);
            newLevel[group] ??= [];

            el.children = el.children.map((child) => {
                const group = DAG[index - 1][child].group;

                let i = 0;
                for (let c of DAG[index - 1]) {
                    if (c.meshlet == DAG[index - 1][child].meshlet) break;

                    if (c.group == group) {
                        i++;
                    }
                }

                return [group || 0, i];
            });

            el.parents = [
                ...new Set(
                    el.parents.map((parent) => {
                        return DAG[index + 1][parent].group;
                    }),
                ),
            ];

            if (el.parents[0] == undefined) {
                el.parents = [];
            }

            newLevel[group].push(el);
        }

        return newLevel;
    };

    DAG = DAG.map(groupify);

    DAG.splice(DAG.length - 1, 1);
    console.log(DAG);

    repr.dag = compressString(DAG);

    mesh.neverdraw = repr;

    createCompute(mesh);
}

// TODO: prevent doubling of triangles in the given borders of crossConnectMeshlets
// this should not be possible, because a triangle a triangle can only be part of one meshlet not multiple ones
//
// the triangles are not twice on the same border but rather reoccur on diffrent ones
//
// TODO: compute meshlet normals and bounding spheres for fast culling, check error calculation

function visualize(mesh, canvas) {
    const DAG = decompressString(mesh.neverdraw.oldDag);
    console.log(DAG);

    const ctx = canvas.getContext("2d");

    const RES = 10;

    const height = (ctx.canvas.height = canvas.scrollHeight * RES);
    const width = (ctx.canvas.width = canvas.scrollWidth * RES);

    const element2position = (c, level, element = undefined) => {
        c++;
        if (element)
            return [
                c * (+width / (DAG[level].length + 1)),
                (+level + 1) * (height / DAG.length),
                Math.log(element.index.length) * RES,
            ];

        return [
            c * (+width / (DAG[level].length + 1)),
            (+level + 1) * (height / DAG.length),
            2 * RES,
        ];
    };

    ctx.lineWidth = 1 * RES;

    for (let level in DAG) {
        for (let element of DAG[level]) {
            ctx.strokeStyle = ctx.fillStyle = `rgb(
              ${Math.floor(255 - (255 * (Math.cos((element.group + 1) * 3) + 1)) / 2)}
              ${Math.floor((255 * (Math.sin((element.group + 1) * 5) + 1)) / 2)}
              ${Math.floor(255 - (255 * (Math.cos((element.group + 1) * 7) + 1)) / 2)}`;

            for (const child of element.children) {
                ctx.beginPath();
                ctx.moveTo(...element2position(element.i, level));
                ctx.lineTo(...element2position(child, level - 1));
                ctx.stroke();
            }
        }
    }

    for (let level in DAG) {
        for (let element of DAG[level]) {
            ctx.fillStyle = `rgb(
              ${Math.floor(255 - (255 * (Math.cos((element.group + 1) * 3) + 1)) / 2)}
              ${Math.floor((255 * (Math.sin((element.group + 1) * 5) + 1)) / 2)}
              ${Math.floor(255 - (255 * (Math.cos((element.group + 1) * 7) + 1)) / 2)}`;

            ctx.beginPath();
            ctx.arc(
                ...element2position(element.i, level, element),
                0,
                2 * Math.PI,
            );
            ctx.fill();

            ctx.fillStyle = "black";
            ctx.font = (10 * RES).toFixed(0) + "px serif";

            //position buffer size
            ctx.fillText(
                element.index.length / 3,
                ...element2position(element.i, level).slice(0, 2),
            );

            /*
      //error at node
      ctx.fillText(
        element.sumError.toFixed(2),
        ...element2position(c, level).slice(0, 2),
      );
      */
        }
    }
}

/*
TODO:
group DAG after groups and make references to children in from of tuples.
delete whole group every iteration

=> gets rid of .filter repeatedly might save some frame time
*/

/*
determining accuracy with distance:

radFov = (fov * Math.PI) / 180;

size = 1 / (distance * Math.tan(radFov / 2));
*/

const _pos_vec = new THREE.Vector3();

function chooseMesh(mesh, camera, threshold) {
    //renderCompute(camera, mesh);

    const MIN_DISTANCE = 1e-5;

    const FORCE = false;

    const pos = _pos_vec.set(0, 0, 0);
    const invFov = 1 / Math.tan((camera.fov * Math.PI) / 360);

    const DAG = decompressString(mesh.neverdraw.dag);
    mesh.neverdraw.dag = { v: DAG, uncompressed: false }; // leave it decompressed

    if (!FORCE) {
        const curDistance = mesh.position.distanceTo(camera.position);

        if (mesh.neverdraw.lastDistance !== undefined) {
            if (
                Math.abs(curDistance - mesh.neverdraw.lastDistance) < 0.2 &&
                mesh.neverdraw.lastThreshold == threshold
            ) {
                return;
            }
        }

        mesh.neverdraw.lastDistance = curDistance;
        mesh.neverdraw.lastThreshold = threshold;
    }

    /*
  Matrix4 structure

  [
    [m_11, m_12, m_13, t_x]
    [m_21, m_22, m_23, t_y]
    [m_31, m_32, m_33, t_z]
    [0, 0, 0, 1]
  ]


  const e = mesh.matrixWorld.elements;

  const scaleX = Math.hypot(e[0], e[1], e[2]);
  const scaleY = Math.hypot(e[4], e[5], e[6]);
  const scaleZ = Math.hypot(e[8], e[9], e[10]);

  */

    const e = mesh.matrixWorld.elements;

    const scale = Math.hypot(e[0], e[1], e[2]); //assuming constant scale

    let results = [];

    const getError = (node) => {
        pos.fromArray(node.center);
        pos.applyMatrix4(mesh.matrixWorld);

        mesh.matrixWorld;

        const distance = Math.max(
            pos.distanceTo(camera.position) - node.bradius * scale,
            MIN_DISTANCE,
        );

        return (invFov * node.sumError) / distance;
    };

    let groups = DAG[DAG.length - 1].slice();
    const addGroup = new Set();

    while (groups.length > 0) {
        // as long as groups are in the queue

        let group = groups.shift(); // get the first group

        let maxError = 0;

        const levelBefore = DAG[group[0].level - 1];

        for (const c of group[0].children) {
            // calculate the maximum error of its children
            const node = levelBefore[c[0]][c[1]];
            const relativeError = getError(node);
            maxError = Math.max(maxError, relativeError);
        }

        if (maxError > threshold && group[0].level > 0) {
            // assumption: child has lower error than parent
            // if the maximum error of its children is above the threshold
            // and this is not a leaf node
            // or the child is blocked

            for (const c of group[0].children) {
                // add childs to queue
                if (addGroup.has(c[0] + "|" + group[0].level)) continue;

                groups.push(levelBefore[c[0]]);
                addGroup.add(c[0] + "|" + group[0].level);
            }
        } else {
            // if the childrens maximum error is below or euqal the threshold set the children as result

            if (group[0].level == 0) {
                // if parent is leaf node

                results.push(...group.flat());
            } else {
                for (const c of group[0].children) {
                    // add all the children of the current group to the results
                    results.push(levelBefore[c[0]][c[1]]);
                }
            }
        }
    }

    let allPositions = [];

    if (results.length == 0) results = DAG[DAG.length - 1].flat();

    for (const result of results) {
        allPositions.push(...result.index);
    }

    //mesh.material.vertexColors = true;

    mesh.geometry.setIndex(allPositions);
    mesh.geometry.index.needsUpdate = true;
}

export { processMesh, visualize, chooseMesh };

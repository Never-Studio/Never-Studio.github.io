import { compile } from "./webgl.js";

function createCompute(mesh) {
    //DELETE
    const NUM = 400;

    const canvas = new OffscreenCanvas(NUM, 1);
    const shaderData = {};
    shaderData.attributes = {};
    shaderData.uniforms = {};
    shaderData.textures = {};
    shaderData.arrays = {};
    shaderData.transformFeedback = {};
    shaderData.buffers = {};

    // WebGL canvas context
    const gl = canvas.getContext("webgl2", { antialias: false });

    shaderData.webglContext = gl;

    // Vertex shader
    const vshader = `#version 300 es

    in vec4 position;

    flat out int index;
    void main() {
      index = gl_VertexID;
      gl_Position = position;
    }`;

    // Fragment shader
    const fshader = `#version 300 es

    precision mediump float;

    uniform vec3 cameraPos;
    uniform mat4 matrixWorld;

    uniform sampler2D adjacency;
    uniform sampler2D meshletData;

    out vec4 outColor;

    void main() {
      int index = int(gl_FragCoord.x);

      //texture2D(meshletData, vec2(index, 0));

      //send the current index back
      //outColor = vec4(index % 256, (index / 256) % 256, (index / 65536) % 256, 255.) / 255.;
    }`;

    // Compile program
    shaderData.program = compile(gl, vshader, fshader);

    //set transform feedbacks

    shaderData.transformFeedback.index = gl.createTransformFeedback();

    gl.bindTransformFeedback(
        gl.TRANSFORM_FEEDBACK,
        shaderData.transformFeedback.index,
    );

    shaderData.buffers.index = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, shaderData.buffers.index);
    gl.bufferData(gl.ARRAY_BUFFER, NUM * 4, gl.DYNAMIC_READ);

    gl.bindBufferBase(
        gl.TRANSFORM_FEEDBACK_BUFFER,
        0,
        shaderData.buffers.index,
    ); // 0 stands for the first specified buffer in ```transformFeedbackVaryings```

    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null); //unbind buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, null); //unbind buffers

    // Get shaders attributes and uniforms
    shaderData.attributes.position = gl.getAttribLocation(
        shaderData.program,
        "position",
    );

    // set adjacency list to texture0
    shaderData.uniforms.adjacency = gl.getUniformLocation(
        shaderData.program,
        "adjacency",
    );

    shaderData.textures.adjacency = gl.createTexture();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, shaderData.textures.adjacency);

    // set texture settings
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    shaderData.arrays.adjacency = new Uint8Array(16 * NUM * 4);

    //target, level, internalformat, width, height, border, format, type, srcData

    // the meshlet-index is encoded in 3 different bytes (RGB values) to allow larger indexes
    // the alpha specifies the level of the node (A value)
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        NUM, //width
        16, //height (adjacent nodes); first 16 are parents; next 16 are children;
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        shaderData.arrays.adjacency,
    );

    gl.uniform1i(shaderData.uniforms.adjacency, 0);

    // set meshlet-positions

    shaderData.uniforms.meshletData = gl.getUniformLocation(
        shaderData.program,
        "meshletData",
    );

    shaderData.textures.meshletData = gl.createTexture();

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, shaderData.textures.meshletData);

    // set texture settings
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    shaderData.arrays.meshletData = new Float32Array(NUM * 2 * 3);

    //target, level, internalformat, width, height, border, format, type, srcData

    // the meshlet center is encoded in 3 different floats (RGB)
    // the second RGB stays for the bounding sphere radius (R) and the simplification error (G)
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGB,
        NUM, //width
        2, //height of the meshlet positions and error
        0,
        gl.RGB,
        gl.FLOAT,
        shaderData.arrays.meshletData,
    );

    gl.uniform1i(shaderData.uniforms.meshletData, 1);

    // set cameraposition
    shaderData.uniforms.cameraPos = gl.getUniformLocation(
        shaderData.program,
        "cameraPos",
    );
    gl.uniform3f(shaderData.uniforms.cameraPos, 0, 0, 0);

    // set the world matrix
    shaderData.uniforms.matrixWorld = gl.getUniformLocation(
        shaderData.program,
        "matrixWorld",
    );

    shaderData.arrays.matrixWorld = new Float32Array([
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0,
    ]);

    gl.uniformMatrix4fv(
        shaderData.uniforms.matrixWorld,
        false, // transpose (always false)
        shaderData.arrays.matrixWorld,
    );

    // Fill a buffer with a list of x/y/z coordinates,
    // and pass them to the position attribute of the vertex shader
    shaderData.arrays.position = new Float32Array([
        -1,
        0,
        0, // point 1
        1,
        0,
        0, // point 2
    ]);

    shaderData.buffers.position = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, shaderData.buffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, shaderData.arrays.position, gl.STATIC_DRAW);
    gl.vertexAttribPointer(
        shaderData.attributes.position, // target
        3, // chunk size (send the values 3 by 3)
        gl.FLOAT, // type
        false, // normalize
        0, // stride
        0, // offset
    );

    gl.enableVertexAttribArray(shaderData.attributes.position);

    mesh.neverdraw.shaderData = shaderData;
}

//from now on render loop

function renderCompute(camera, mesh) {
    const shaderData = mesh.neverdraw.shaderData;
    const gl = shaderData.webglContext;

    if (camera) {
        // set camera position
        gl.uniform3f(
            shaderData.uniforms.cameraPos,
            camera.position.x,
            camera.position.y,
            camera.position.z,
        );
    }

    if (mesh) {
        // set world matrix
        mesh.matrixWorld.toArray(shaderData.arrays.matrixWorld);
        gl.uniformMatrix4fv(
            shaderData.uniforms.matrixWorld,
            false, // transpose (always false)
            shaderData.arrays.matrixWorld,
        );
    }

    // Set the clear color
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Clear canvas
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.RASTERIZER_DISCARD); // disable fragment shader as we only use the vertex shader

    gl.bindTransformFeedback(
        gl.TRANSFORM_FEEDBACK,
        shaderData.transformFeedback.index,
    ); // bind transformFeedback
    gl.beginTransformFeedback(gl.POINTS); // start transformFeedback

    // Render
    gl.drawArrays(
        gl.POINTS, // mode
        0, // start
        2, // count
    );

    gl.endTransformFeedback(); // end transformFeedback
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null); // unbind transformFeedback

    gl.disable(gl.RASTERIZER_DISCARD); // enable fragment shader as we only use the vertex shader

    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); // comment out later

    gl.finish();

    gl.bindBuffer(gl.ARRAY_BUFFER, shaderData.buffers.index);
    const bufferSize = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE);

    const indexBufferArray = new Int32Array(bufferSize / 4);

    gl.getBufferSubData(
        gl.ARRAY_BUFFER,
        0, // byte offset into GPU buffer,
        indexBufferArray,
    );

    console.log(indexBufferArray);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

export { createCompute, renderCompute };

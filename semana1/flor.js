const canvas = document.getElementById("glCanvas1");
const gl = canvas.getContext("webgl2");

if (!gl) {
  throw new Error("WebGL 2 não é suportado.");
}

const vertexShaderSource = `#version 300 es
in vec2 aPosition;
in vec3 aColor;
out vec3 vColor;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
  vColor = aColor;
}
`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
in vec3 vColor;
out vec4 outColor;

void main() {
  outColor = vec4(vColor, 1.0);
}
`;

function createShader(glContext, type, source) {
  const shader = glContext.createShader(type);
  glContext.shaderSource(shader, source);
  glContext.compileShader(shader);

  if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
    const error = glContext.getShaderInfoLog(shader);
    glContext.deleteShader(shader);
    throw new Error(error);
  }

  return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  throw new Error(gl.getProgramInfoLog(program));
}

const vertices = [];
const colors = [];

function addTriangle(a, b, c, color) {
  vertices.push(...a, ...b, ...c);
  colors.push(...color, ...color, ...color);
}

function addCircle(centerX, centerY, radius, segments, color) {
  for (let i = 0; i < segments; i += 1) {
    const angle1 = (i / segments) * Math.PI * 2.0;
    const angle2 = ((i + 1) / segments) * Math.PI * 2.0;
    const p1 = [centerX + Math.cos(angle1) * radius, centerY + Math.sin(angle1) * radius];
    const p2 = [centerX + Math.cos(angle2) * radius, centerY + Math.sin(angle2) * radius];
    addTriangle([centerX, centerY], p1, p2, color);
  }
}

// Caule
addTriangle([-0.04, -0.85], [0.04, -0.85], [0.04, -0.2], [0.1, 0.8, 0.2]);
addTriangle([-0.04, -0.85], [0.04, -0.2], [-0.04, -0.2], [0.1, 0.8, 0.2]);

// Folhas
addTriangle([-0.04, -0.55], [-0.38, -0.45], [-0.04, -0.35], [0.0, 0.7, 0.2]);
addTriangle([0.04, -0.45], [0.38, -0.35], [0.04, -0.25], [0.0, 0.7, 0.2]);

// Petalas
addCircle(0.0, 0.22, 0.18, 28, [0.96, 0.32, 0.65]);
addCircle(0.22, 0.0, 0.18, 28, [0.93, 0.25, 0.58]);
addCircle(0.0, -0.22, 0.18, 28, [0.96, 0.32, 0.65]);
addCircle(-0.22, 0.0, 0.18, 28, [0.93, 0.25, 0.58]);
addCircle(0.16, 0.16, 0.16, 24, [0.98, 0.42, 0.72]);
addCircle(-0.16, 0.16, 0.16, 24, [0.98, 0.42, 0.72]);

// Miolo
addCircle(0.0, 0.0, 0.14, 32, [1.0, 0.82, 0.15]);

const vertexData = new Float32Array(vertices);
const colorData = new Float32Array(colors);

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, colorData, gl.STATIC_DRAW);

const positionLocation = gl.getAttribLocation(program, "aPosition");
const colorLocation = gl.getAttribLocation(program, "aColor");

gl.useProgram(program);
gl.viewport(0, 0, canvas.width, canvas.height);
gl.clearColor(0.0, 1.0, 0.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.enableVertexAttribArray(colorLocation);
gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

gl.drawArrays(gl.TRIANGLES, 0, vertexData.length / 2);
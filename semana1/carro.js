const carCanvas = document.getElementById("glCanvasFan");
const carGl = carCanvas.getContext("webgl2");

if (!carGl) {
  throw new Error("WebGL 2 não é suportado.");
}

const carVertexShaderSource = `#version 300 es
in vec2 aPosition;
in vec3 aColor;
out vec3 vColor;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
  vColor = aColor;
}
`;

const carFragmentShaderSource = `#version 300 es
precision mediump float;
in vec3 vColor;
out vec4 outColor;

void main() {
  outColor = vec4(vColor, 1.0);
}
`;

function createCarShader(glContext, type, source) {
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

const carVertexShader = createCarShader(carGl, carGl.VERTEX_SHADER, carVertexShaderSource);
const carFragmentShader = createCarShader(carGl, carGl.FRAGMENT_SHADER, carFragmentShaderSource);

const carProgram = carGl.createProgram();
carGl.attachShader(carProgram, carVertexShader);
carGl.attachShader(carProgram, carFragmentShader);
carGl.linkProgram(carProgram);

if (!carGl.getProgramParameter(carProgram, carGl.LINK_STATUS)) {
  throw new Error(carGl.getProgramInfoLog(carProgram));
}

const carVertices = [];
const carColors = [];

function addCarTriangle(a, b, c, color) {
  carVertices.push(...a, ...b, ...c);
  carColors.push(...color, ...color, ...color);
}

function addCarRect(x1, y1, x2, y2, color) {
  addCarTriangle([x1, y1], [x2, y1], [x2, y2], color);
  addCarTriangle([x1, y1], [x2, y2], [x1, y2], color);
}

function addCarCircle(centerX, centerY, radius, segments, color) {
  for (let i = 0; i < segments; i += 1) {
    const angle1 = (i / segments) * Math.PI * 2.0;
    const angle2 = ((i + 1) / segments) * Math.PI * 2.0;
    const p1 = [centerX + Math.cos(angle1) * radius, centerY + Math.sin(angle1) * radius];
    const p2 = [centerX + Math.cos(angle2) * radius, centerY + Math.sin(angle2) * radius];
    addCarTriangle([centerX, centerY], p1, p2, color);
  }
}

// Base do carro
addCarRect(-0.88, -0.35, 0.85, 0.05, [0.8, 0.1, 0.1]);

// Parte superior (cabine)
addCarTriangle([-0.15, 0.05], [0.5, 0.05], [0.25, 0.45], [0.9, 0.2, 0.2]);
addCarTriangle([-0.15, 0.05], [0.25, 0.45], [-0.15, 0.45], [0.9, 0.2, 0.2]);

// Janelas
addCarTriangle([0.0, 0.1], [0.36, 0.1], [0.2, 0.38], [0.6, 0.85, 1.0]);
addCarTriangle([0.0, 0.1], [0.2, 0.38], [0.00, 0.38], [0.6, 0.85, 1.0]);

// Parachoques
addCarRect(-0.92, -0.3, -0.85, -0.08, [0.2, 0.2, 0.25]);
addCarRect(0.85, -0.3, 0.92, -0.08, [0.2, 0.2, 0.25]);

// Rodas
addCarCircle(-0.5, -0.38, 0.2, 32, [0.08, 0.08, 0.08]);
addCarCircle(0.5, -0.38, 0.2, 32, [0.08, 0.08, 0.08]);
addCarCircle(-0.5, -0.38, 0.09, 24, [0.75, 0.75, 0.78]);
addCarCircle(0.5, -0.38, 0.09, 24, [0.75, 0.75, 0.78]);

// Farol
addCarRect(0.78, -0.12, 0.88, -0.02, [1.0, 0.95, 0.5]);

const carVertexData = new Float32Array(carVertices);
const carColorData = new Float32Array(carColors);

const carVertexBuffer = carGl.createBuffer();
carGl.bindBuffer(carGl.ARRAY_BUFFER, carVertexBuffer);
carGl.bufferData(carGl.ARRAY_BUFFER, carVertexData, carGl.STATIC_DRAW);

const carColorBuffer = carGl.createBuffer();
carGl.bindBuffer(carGl.ARRAY_BUFFER, carColorBuffer);
carGl.bufferData(carGl.ARRAY_BUFFER, carColorData, carGl.STATIC_DRAW);

const carPositionLocation = carGl.getAttribLocation(carProgram, "aPosition");
const carColorLocation = carGl.getAttribLocation(carProgram, "aColor");

carGl.useProgram(carProgram);
carGl.viewport(0, 0, carCanvas.width, carCanvas.height);
carGl.clearColor(0.4, 0.5, 0.9, 1.0);
carGl.clear(carGl.COLOR_BUFFER_BIT);

carGl.bindBuffer(carGl.ARRAY_BUFFER, carVertexBuffer);
carGl.enableVertexAttribArray(carPositionLocation);
carGl.vertexAttribPointer(carPositionLocation, 2, carGl.FLOAT, false, 0, 0);

carGl.bindBuffer(carGl.ARRAY_BUFFER, carColorBuffer);
carGl.enableVertexAttribArray(carColorLocation);
carGl.vertexAttribPointer(carColorLocation, 3, carGl.FLOAT, false, 0, 0);

carGl.drawArrays(carGl.TRIANGLES, 0, carVertexData.length / 2);

const robotCanvas = document.getElementById("glCanvas2");
const robotGl = robotCanvas.getContext("webgl2");

if (!robotGl) {
  throw new Error("WebGL 2 não é suportado.");
}

const robotVertexShaderSource = `#version 300 es
in vec2 aPosition;
in vec3 aColor;
out vec3 vColor;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
  vColor = aColor;
}
`;

const robotFragmentShaderSource = `#version 300 es
precision mediump float;
in vec3 vColor;
out vec4 outColor;

void main() {
  outColor = vec4(vColor, 1.0);
}
`;

function createRobotShader(glContext, type, source) {
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

const robotVertexShader = createRobotShader(robotGl, robotGl.VERTEX_SHADER, robotVertexShaderSource);
const robotFragmentShader = createRobotShader(robotGl, robotGl.FRAGMENT_SHADER, robotFragmentShaderSource);

const robotProgram = robotGl.createProgram();
robotGl.attachShader(robotProgram, robotVertexShader);
robotGl.attachShader(robotProgram, robotFragmentShader);
robotGl.linkProgram(robotProgram);

if (!robotGl.getProgramParameter(robotProgram, robotGl.LINK_STATUS)) {
  throw new Error(robotGl.getProgramInfoLog(robotProgram));
}

const robotVertices = [];
const robotColors = [];

function addRobotTriangle(a, b, c, color) {
  robotVertices.push(...a, ...b, ...c);
  robotColors.push(...color, ...color, ...color);
}

function addRobotRect(x1, y1, x2, y2, color) {
  addRobotTriangle([x1, y1], [x2, y1], [x2, y2], color);
  addRobotTriangle([x1, y1], [x2, y2], [x1, y2], color);
}

function addRobotCircle(centerX, centerY, radius, segments, color) {
  for (let i = 0; i < segments; i += 1) {
    const angle1 = (i / segments) * Math.PI * 2.0;
    const angle2 = ((i + 1) / segments) * Math.PI * 2.0;
    const p1 = [centerX + Math.cos(angle1) * radius, centerY + Math.sin(angle1) * radius];
    const p2 = [centerX + Math.cos(angle2) * radius, centerY + Math.sin(angle2) * radius];
    addRobotTriangle([centerX, centerY], p1, p2, color);
  }
}

// Cabeça
addRobotRect(-0.34, 0.25, 0.34, 0.75, [0.64, 0.68, 0.76]);

// Antena
addRobotRect(-0.03, 0.75, 0.03, 0.9, [0.85, 0.85, 0.9]);
addRobotCircle(0.0, 0.93, 0.05, 20, [1.0, 0.25, 0.25]);

// Olhos
addRobotCircle(-0.15, 0.52, 0.07, 22, [0.0, 0.9, 1.0]);
addRobotCircle(0.15, 0.52, 0.07, 22, [0.0, 0.9, 1.0]);
addRobotCircle(-0.15, 0.52, 0.03, 18, [0.0, 0.2, 0.3]);
addRobotCircle(0.15, 0.52, 0.03, 18, [0.0, 0.2, 0.3]);

// Boca
addRobotRect(-0.18, 0.34, 0.18, 0.4, [0.18, 0.2, 0.26]);

// Tronco
addRobotRect(-0.41, -0.345, 0.41, 0.245, [0.48, 0.54, 0.64]);

// Bracos
addRobotRect(-0.62, -0.4, -0.42, 0.16, [0.55, 0.61, 0.7]);
addRobotRect(0.42, -0.4, 0.62, 0.16, [0.55, 0.61, 0.7]);

// Pernas
addRobotRect(-0.28, -0.85, -0.08, -0.35, [0.38, 0.44, 0.54]);
addRobotRect(0.08, -0.85, 0.28, -0.35, [0.38, 0.44, 0.54]);

// Pés
addRobotRect(-0.3, -0.95, -0.06, -0.85, [0.2, 0.1, 0.4]);
addRobotRect(0.3, -0.95, 0.06, -0.85, [0.2, 0.1, 0.4]);

const robotVertexData = new Float32Array(robotVertices);
const robotColorData = new Float32Array(robotColors);

const robotVertexBuffer = robotGl.createBuffer();
robotGl.bindBuffer(robotGl.ARRAY_BUFFER, robotVertexBuffer);
robotGl.bufferData(robotGl.ARRAY_BUFFER, robotVertexData, robotGl.STATIC_DRAW);

const robotColorBuffer = robotGl.createBuffer();
robotGl.bindBuffer(robotGl.ARRAY_BUFFER, robotColorBuffer);
robotGl.bufferData(robotGl.ARRAY_BUFFER, robotColorData, robotGl.STATIC_DRAW);

const robotPositionLocation = robotGl.getAttribLocation(robotProgram, "aPosition");
const robotColorLocation = robotGl.getAttribLocation(robotProgram, "aColor");

robotGl.useProgram(robotProgram);
robotGl.viewport(0, 0, robotCanvas.width, robotCanvas.height);
robotGl.clearColor(0.1, 0.1, 0.1, 1.0);
robotGl.clear(robotGl.COLOR_BUFFER_BIT);

robotGl.bindBuffer(robotGl.ARRAY_BUFFER, robotVertexBuffer);
robotGl.enableVertexAttribArray(robotPositionLocation);
robotGl.vertexAttribPointer(robotPositionLocation, 2, robotGl.FLOAT, false, 0, 0);

robotGl.bindBuffer(robotGl.ARRAY_BUFFER, robotColorBuffer);
robotGl.enableVertexAttribArray(robotColorLocation);
robotGl.vertexAttribPointer(robotColorLocation, 3, robotGl.FLOAT, false, 0, 0);

robotGl.drawArrays(robotGl.TRIANGLES, 0, robotVertexData.length / 2);

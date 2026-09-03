const canvas1 = document.getElementById("glCanvas1");
const gl1 = canvas1.getContext("webgl2");

if (!gl1) {
  throw new Error("WebGL 2 não é suportado.");
}

const vertexShaderSource1 = `#version 300 es
in vec2 aPosition;
in vec3 aColor;
out vec3 vColor;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
  gl_PointSize = 2.0;
  vColor = aColor;
}
`;

const fragmentShaderSource1 = `#version 300 es
precision mediump float;
in vec3 vColor;
out vec4 outColor;

void main() {
  outColor = vec4(vColor, 1.0);
}
`;

function createShader1(glContext, type, source) {
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

const vertexShader1 = createShader1(gl1, gl1.VERTEX_SHADER, vertexShaderSource1);
const fragmentShader1 = createShader1(gl1, gl1.FRAGMENT_SHADER, fragmentShaderSource1);
const program1 = gl1.createProgram();
gl1.attachShader(program1, vertexShader1);
gl1.attachShader(program1, fragmentShader1);
gl1.linkProgram(program1);

if (!gl1.getProgramParameter(program1, gl1.LINK_STATUS)) {
  throw new Error(gl1.getProgramInfoLog(program1));
}

const positionLocation1 = gl1.getAttribLocation(program1, "aPosition");
const colorLocation1 = gl1.getAttribLocation(program1, "aColor");
const positionBuffer1 = gl1.createBuffer();
const colorBuffer1 = gl1.createBuffer();

const palette = [
  [0.1, 0.3, 1.0], // 0: azul
  [1.0, 0.1, 0.1], // 1: vermelho
  [0.1, 1.0, 0.1], // 2: verde
  [1.0, 1.0, 0.1], // 3: amarelo
  [1.0, 0.0, 1.0], // 4: magenta
  [0.0, 1.0, 1.0], // 5: ciano
  [1.0, 0.5, 0.0], // 6: laranja
  [0.6, 0.3, 0.95], // 7: roxo
  [1.0, 1.0, 1.0], // 8: branco
  [0.7, 0.7, 0.7], // 9: cinza
];

let currentColor = palette[0];
let firstPoint = null;
let currentLine = { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } };

function bresenhamLine(startX, startY, endX, endY) {
  const points = [];
  let x0 = startX;
  let y0 = startY;
  const x1 = endX;
  const y1 = endY;

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    points.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) {
      break;
    }
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }

  return points;
}

function canvasToPixel(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * canvas.width);
  const yFromTop = Math.floor(((event.clientY - rect.top) / rect.height) * canvas.height);
  const y = canvas.height - 1 - yFromTop;
  return {
    x: Math.min(canvas.width - 1, Math.max(0, x)),
    y: Math.min(canvas.height - 1, Math.max(0, y)),
  };
}

function pixelToNdc(x, y, canvas) {
  const ndcX = (x / (canvas.width - 1)) * 2.0 - 1.0;
  const ndcY = (y / (canvas.height - 1)) * 2.0 - 1.0;
  return [ndcX, ndcY];
}

function drawPoints(points, color) {
  const positionArray = [];
  const colorArray = [];

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const ndcPoint = pixelToNdc(point.x, point.y, canvas1);
    positionArray.push(ndcPoint[0], ndcPoint[1]);
    colorArray.push(color[0], color[1], color[2]);
  }

  gl1.useProgram(program1);
  gl1.viewport(0, 0, canvas1.width, canvas1.height);
  gl1.clearColor(0.0, 0.0, 0.0, 1.0);
  gl1.clear(gl1.COLOR_BUFFER_BIT);

  gl1.bindBuffer(gl1.ARRAY_BUFFER, positionBuffer1);
  gl1.bufferData(gl1.ARRAY_BUFFER, new Float32Array(positionArray), gl1.STATIC_DRAW);
  gl1.enableVertexAttribArray(positionLocation1);
  gl1.vertexAttribPointer(positionLocation1, 2, gl1.FLOAT, false, 0, 0);

  gl1.bindBuffer(gl1.ARRAY_BUFFER, colorBuffer1);
  gl1.bufferData(gl1.ARRAY_BUFFER, new Float32Array(colorArray), gl1.STATIC_DRAW);
  gl1.enableVertexAttribArray(colorLocation1);
  gl1.vertexAttribPointer(colorLocation1, 3, gl1.FLOAT, false, 0, 0);

  gl1.drawArrays(gl1.POINTS, 0, points.length);
}

function renderLine() {
  const points = bresenhamLine(
    currentLine.start.x,
    currentLine.start.y,
    currentLine.end.x,
    currentLine.end.y
  );
  drawPoints(points, currentColor);
}

canvas1.addEventListener("mousedown", (event) => {
  if (event.button !== 0) {
    return;
  }

  const point = canvasToPixel(event, canvas1);
  if (firstPoint === null) {
    firstPoint = point;
    return;
  }

  currentLine = { start: firstPoint, end: point };
  firstPoint = null;
  renderLine();
});

window.addEventListener("keydown", (event) => {
  if (event.key >= "0" && event.key <= "9") {
    currentColor = palette[Number(event.key)];
    renderLine();
  }
});

renderLine();

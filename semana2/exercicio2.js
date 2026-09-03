const canvas2 = document.getElementById("glCanvas2");
const gl2 = canvas2.getContext("webgl2");

if (!gl2) {
  throw new Error("WebGL 2 não é suportado.");
}

const vertexShaderSource2 = `#version 300 es
in vec2 aPosition;
in vec3 aColor;
out vec3 vColor;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
  gl_PointSize = 2.0;
  vColor = aColor;
}
`;

const fragmentShaderSource2 = `#version 300 es
precision mediump float;
in vec3 vColor;
out vec4 outColor;

void main() {
  outColor = vec4(vColor, 1.0);
}
`;

function createShader2(glContext, type, source) {
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

const vertexShader2 = createShader2(gl2, gl2.VERTEX_SHADER, vertexShaderSource2);
const fragmentShader2 = createShader2(gl2, gl2.FRAGMENT_SHADER, fragmentShaderSource2);
const program2 = gl2.createProgram();
gl2.attachShader(program2, vertexShader2);
gl2.attachShader(program2, fragmentShader2);
gl2.linkProgram(program2);

if (!gl2.getProgramParameter(program2, gl2.LINK_STATUS)) {
  throw new Error(gl2.getProgramInfoLog(program2));
}

const positionLocation2 = gl2.getAttribLocation(program2, "aPosition");
const colorLocation2 = gl2.getAttribLocation(program2, "aColor");
const positionBuffer2 = gl2.createBuffer();
const colorBuffer2 = gl2.createBuffer();

const palette2 = [
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

let currentColor2 = palette2[0];
let mode = "line";
let clickPoints = [];
let currentFigure = {
  type: "line",
  points: [{ x: 0, y: 0 }, { x: 0, y: 0 }],
};

function bresenhamLine2(startX, startY, endX, endY) {
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

function canvasToPixel2(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * canvas.width);
  const yFromTop = Math.floor(((event.clientY - rect.top) / rect.height) * canvas.height);
  const y = canvas.height - 1 - yFromTop;
  return {
    x: Math.min(canvas.width - 1, Math.max(0, x)),
    y: Math.min(canvas.height - 1, Math.max(0, y)),
  };
}

function pixelToNdc2(x, y, canvas) {
  const ndcX = (x / (canvas.width - 1)) * 2.0 - 1.0;
  const ndcY = (y / (canvas.height - 1)) * 2.0 - 1.0;
  return [ndcX, ndcY];
}

function figureToPoints(figure) {
  if (figure.type === "line") {
    return bresenhamLine2(
      figure.points[0].x,
      figure.points[0].y,
      figure.points[1].x,
      figure.points[1].y
    );
  }

  const a = figure.points[0];
  const b = figure.points[1];
  const c = figure.points[2];
  const ab = bresenhamLine2(a.x, a.y, b.x, b.y);
  const bc = bresenhamLine2(b.x, b.y, c.x, c.y);
  const ca = bresenhamLine2(c.x, c.y, a.x, a.y);
  return [...ab, ...bc, ...ca];
}

function drawFigure(figure) {
  const points = figureToPoints(figure);
  const positionArray = [];
  const colorArray = [];

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const ndcPoint = pixelToNdc2(point.x, point.y, canvas2);
    positionArray.push(ndcPoint[0], ndcPoint[1]);
    colorArray.push(currentColor2[0], currentColor2[1], currentColor2[2]);
  }

  gl2.useProgram(program2);
  gl2.viewport(0, 0, canvas2.width, canvas2.height);
  gl2.clearColor(0.0, 0.0, 0.0, 1.0);
  gl2.clear(gl2.COLOR_BUFFER_BIT);

  gl2.bindBuffer(gl2.ARRAY_BUFFER, positionBuffer2);
  gl2.bufferData(gl2.ARRAY_BUFFER, new Float32Array(positionArray), gl2.STATIC_DRAW);
  gl2.enableVertexAttribArray(positionLocation2);
  gl2.vertexAttribPointer(positionLocation2, 2, gl2.FLOAT, false, 0, 0);

  gl2.bindBuffer(gl2.ARRAY_BUFFER, colorBuffer2);
  gl2.bufferData(gl2.ARRAY_BUFFER, new Float32Array(colorArray), gl2.STATIC_DRAW);
  gl2.enableVertexAttribArray(colorLocation2);
  gl2.vertexAttribPointer(colorLocation2, 3, gl2.FLOAT, false, 0, 0);

  gl2.drawArrays(gl2.POINTS, 0, points.length);
}

function renderCurrentFigure() {
  drawFigure(currentFigure);
}

function activateLineMode() {
  mode = "line";
  clickPoints = [];
}

function activateTriangleMode() {
  mode = "triangle";
  clickPoints = [];
}

canvas2.addEventListener("mousedown", (event) => {
  if (event.button !== 0) {
    return;
  }

  const point = canvasToPixel2(event, canvas2);
  clickPoints.push(point);

  if (mode === "line" && clickPoints.length === 2) {
    currentFigure = {
      type: "line",
      points: [clickPoints[0], clickPoints[1]],
    };
    clickPoints = [];
    renderCurrentFigure();
    return;
  }

  if (mode === "triangle" && clickPoints.length === 3) {
    currentFigure = {
      type: "triangle",
      points: [clickPoints[0], clickPoints[1], clickPoints[2]],
    };
    clickPoints = [];
    renderCurrentFigure();
  }
});

window.addEventListener("keydown", (event) => {
  const key = event.key;

  if (key >= "0" && key <= "9") {
    currentColor2 = palette2[Number(key)];
    renderCurrentFigure();
    return;
  }

  if (key === "r" || key === "R") {
    activateLineMode();
    return;
  }

  if (key === "t" || key === "T") {
    activateTriangleMode();
  }
});

renderCurrentFigure();

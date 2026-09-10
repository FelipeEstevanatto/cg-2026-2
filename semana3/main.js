const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");
const scoreLabel = document.getElementById("scoreLabel");

if (!gl) {
  throw new Error("WebGL 2 nao e suportado.");
}

// --------------------------------------------------
// VERTICES E CORES
// --------------------------------------------------

function verticesBarra() {
  return new Float32Array([
    -0.05, 0.2,
    -0.05, -0.2,
    0.05, 0.2,
    0.05, 0.2,
    -0.05, -0.2,
    0.05, -0.2,
  ]);
}

function verticesBola() {
  const vertices = [];
  const numSegments = 30;
  const radius = 0.05;

  for (let i = 0; i < numSegments; i += 1) {
    const theta1 = (i / numSegments) * 2 * Math.PI;
    const theta2 = ((i + 1) / numSegments) * 2 * Math.PI;

    vertices.push(0, 0);
    vertices.push(radius * Math.cos(theta1), radius * Math.sin(theta1));
    vertices.push(radius * Math.cos(theta2), radius * Math.sin(theta2));
  }

  return new Float32Array(vertices);
}

function verticesLinhaCentro() {
  return new Float32Array([
    -0.01, 1.0,
    -0.01, -1.0,
    0.01, 1.0,
    0.01, 1.0,
    -0.01, -1.0,
    0.01, -1.0,
  ]);
}

const verticesBarraDireita = verticesBarra();
const corBarraDireita = new Float32Array([0.0, 0.0, 1.0]);

const verticesBarraEsquerda = verticesBarra();
const corBarraEsquerda = new Float32Array([0.0, 1.0, 0.0]);

const verticesBolaCentro = verticesBola();
const corBolaCentro = new Float32Array([1.0, 0.0, 0.0]);

const verticesCentro = verticesLinhaCentro();
const corCentro = new Float32Array([0.6, 0.6, 0.6]);

// --------------------------------------------------
// TRANSFORMACOES
// --------------------------------------------------

let MbarraEsquerda = m3.translation(-0.9, 0.0);
let MbarraDireita = m3.translation(0.9, 0.0);
let MbolaCentro = m3.identity();
const MlinhaCentro = m3.identity();

// --------------------------------------------------
// BUFFER
// --------------------------------------------------

const verticesBuffer = gl.createBuffer();

// --------------------------------------------------
// VERTEX SHADER
// --------------------------------------------------

const vertexShaderSource = `#version 300 es
in vec2 aPosition;
uniform mat3 u_transform;

void main() {
  vec3 position = u_transform * vec3(aPosition, 1.0);
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// --------------------------------------------------
// FRAGMENT SHADER
// --------------------------------------------------

const fragmentShaderSource = `#version 300 es
precision mediump float;
uniform vec3 uColor;
out vec4 outColor;

void main() {
  outColor = vec4(uColor, 1.0);
}
`;

// --------------------------------------------------
// COMPILAR SHADERS
// --------------------------------------------------

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

// --------------------------------------------------
// CRIAR PROGRAMA
// --------------------------------------------------

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  throw new Error(gl.getProgramInfoLog(program));
}

// --------------------------------------------------
// LOCAL DOS ATRIBUTOS E UNIFORMS
// --------------------------------------------------

const positionLocation = gl.getAttribLocation(program, "aPosition");
const colorLocation = gl.getUniformLocation(program, "uColor");
const transformLocation = gl.getUniformLocation(program, "u_transform");

// --------------------------------------------------
// PARAMETROS DE JOGO
// --------------------------------------------------

const numComponents = 2;
const limiteVertical = 1.0;
const barraHalfWidth = 0.05;
const barraHalfHeight = 0.2;
const bolaRaio = 0.05;
const velocidadeBarra = 0.018;
const velocidadeInicialBola = 0.006;
const velocidadeMaxBola = 0.02;

let esquerdaY = 0.0;
let direitaY = 0.0;
let bolaX = 0.0;
let bolaY = 0.0;
let bolaVelX = velocidadeInicialBola;
let bolaVelY = velocidadeInicialBola;
let placarEsquerda = 0;
let placarDireita = 0;

const pressedKeys = new Set();

function atualizaPlacar() {
  scoreLabel.textContent = `Placar: ${placarEsquerda} x ${placarDireita}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function drawObjeto(vertices, color, transform) {
  gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  gl.uniform3fv(colorLocation, color);
  gl.uniformMatrix3fv(transformLocation, false, transform);

  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / numComponents);
}

function drawBarraEsquerda() {
  drawObjeto(verticesBarraEsquerda, corBarraEsquerda, MbarraEsquerda);
}

function drawBarraDireita() {
  drawObjeto(verticesBarraDireita, corBarraDireita, MbarraDireita);
}

function drawBolaCentro() {
  drawObjeto(verticesBolaCentro, corBolaCentro, MbolaCentro);
}

function drawLinhaCentro() {
  drawObjeto(verticesCentro, corCentro, MlinhaCentro);
}

function resetBola(paraDireita) {
  bolaX = 0;
  bolaY = 0;
  bolaVelX = paraDireita ? velocidadeInicialBola : -velocidadeInicialBola;
  bolaVelY = (Math.random() > 0.5 ? 1 : -1) * velocidadeInicialBola;
}

function resetJogo() {
  placarEsquerda = 0;
  placarDireita = 0;
  esquerdaY = 0;
  direitaY = 0;
  resetBola(Math.random() > 0.5);
  atualizaPlacar();
}

function atualizaEntrada() {
  if (pressedKeys.has("w") || pressedKeys.has("W")) {
    esquerdaY += velocidadeBarra;
  }
  if (pressedKeys.has("s") || pressedKeys.has("S")) {
    esquerdaY -= velocidadeBarra;
  }
  if (pressedKeys.has("ArrowUp")) {
    direitaY += velocidadeBarra;
  }
  if (pressedKeys.has("ArrowDown")) {
    direitaY -= velocidadeBarra;
  }

  const limiteBarra = limiteVertical - barraHalfHeight;
  esquerdaY = clamp(esquerdaY, -limiteBarra, limiteBarra);
  direitaY = clamp(direitaY, -limiteBarra, limiteBarra);
}

function colisaoComBarra(xBarra, yBarra) {
  const dentroX = Math.abs(bolaX - xBarra) <= (barraHalfWidth + bolaRaio);
  const dentroY = Math.abs(bolaY - yBarra) <= (barraHalfHeight + bolaRaio);
  return dentroX && dentroY;
}

function trataColisaoBarras() {
  const xBarraEsquerda = -0.9;
  const xBarraDireita = 0.9;

  if (bolaVelX < 0 && colisaoComBarra(xBarraEsquerda, esquerdaY)) {
    bolaX = xBarraEsquerda + barraHalfWidth + bolaRaio;
    bolaVelX = -bolaVelX;
    const impacto = (bolaY - esquerdaY) / barraHalfHeight;
    bolaVelY += impacto * 0.004;
  }

  if (bolaVelX > 0 && colisaoComBarra(xBarraDireita, direitaY)) {
    bolaX = xBarraDireita - barraHalfWidth - bolaRaio;
    bolaVelX = -bolaVelX;
    const impacto = (bolaY - direitaY) / barraHalfHeight;
    bolaVelY += impacto * 0.004;
  }

  bolaVelY = clamp(bolaVelY, -velocidadeMaxBola, velocidadeMaxBola);
}

function trataColisaoParedes() {
  if (bolaY + bolaRaio >= limiteVertical) {
    bolaY = limiteVertical - bolaRaio;
    bolaVelY = -Math.abs(bolaVelY);
  }
  if (bolaY - bolaRaio <= -limiteVertical) {
    bolaY = -limiteVertical + bolaRaio;
    bolaVelY = Math.abs(bolaVelY);
  }
}

function trataPontuacao() {
  if (bolaX + bolaRaio < -1.0) {
    placarDireita += 1;
    atualizaPlacar();
    resetBola(true);
  } else if (bolaX - bolaRaio > 1.0) {
    placarEsquerda += 1;
    atualizaPlacar();
    resetBola(false);
  }
}

function atualizaAnimacao() {
  atualizaEntrada();

  bolaX += bolaVelX;
  bolaY += bolaVelY;

  trataColisaoParedes();
  trataColisaoBarras();
  trataPontuacao();

  MbarraEsquerda = m3.translation(-0.9, esquerdaY);
  MbarraDireita = m3.translation(0.9, direitaY);
  MbolaCentro = m3.translation(bolaX, bolaY);
}

function drawScene() {
  atualizaAnimacao();

  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);
  drawLinhaCentro();
  drawBarraEsquerda();
  drawBarraDireita();
  drawBolaCentro();

  requestAnimationFrame(drawScene);
}

window.addEventListener("keydown", (event) => {
  pressedKeys.add(event.key);

  if (event.key === " ") {
    resetJogo();
  }
});

window.addEventListener("keyup", (event) => {
  pressedKeys.delete(event.key);
});

// --------------------------------------------------
// INICIO DO DESENHO
// --------------------------------------------------

gl.viewport(0, 0, canvas.width, canvas.height);
gl.clearColor(0.1, 0.1, 0.1, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

resetJogo();
drawScene();

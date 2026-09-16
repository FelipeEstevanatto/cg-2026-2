const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
  throw new Error("WebGL 2 nao e suportado.");
}

// --------------------------------------------------
// FUNCOES AUXILIARES DE GEOMETRIA (semana 1)
// --------------------------------------------------

function pushRect(vertices, x1, y1, x2, y2) {
  vertices.push(
    x1, y1, x2, y1, x2, y2,
    x1, y1, x2, y2, x1, y2
  );
}

function pushCircle(vertices, centerX, centerY, radius, segments) {
  for (let i = 0; i < segments; i += 1) {
    const angle1 = (i / segments) * Math.PI * 2.0;
    const angle2 = ((i + 1) / segments) * Math.PI * 2.0;
    const p1x = centerX + Math.cos(angle1) * radius;
    const p1y = centerY + Math.sin(angle1) * radius;
    const p2x = centerX + Math.cos(angle2) * radius;
    const p2y = centerY + Math.sin(angle2) * radius;
    vertices.push(centerX, centerY, p1x, p1y, p2x, p2y);
  }
}

function buildVerticesRect(x1, y1, x2, y2) {
  const v = [];
  pushRect(v, x1, y1, x2, y2);
  return new Float32Array(v);
}

function buildVerticesCircle(cx, cy, radius, segments) {
  const v = [];
  pushCircle(v, cx, cy, radius, segments);
  return new Float32Array(v);
}

// --------------------------------------------------
// SHADERS E PROGRAMA
// --------------------------------------------------

const vertexShaderSource = `#version 300 es
in vec2 aPosition;
uniform mat3 u_transform;

void main() {
  vec3 position = u_transform * vec3(aPosition, 1.0);
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
uniform vec3 uColor;
out vec4 outColor;

void main() {
  outColor = vec4(uColor, 1.0);
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

function createProgram(glContext, vertexSource, fragmentSource) {
  const vertexShader = createShader(glContext, glContext.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(glContext, glContext.FRAGMENT_SHADER, fragmentSource);
  const program = glContext.createProgram();
  glContext.attachShader(program, vertexShader);
  glContext.attachShader(program, fragmentShader);
  glContext.linkProgram(program);

  if (!glContext.getProgramParameter(program, glContext.LINK_STATUS)) {
    throw new Error(glContext.getProgramInfoLog(program));
  }

  return program;
}

const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);

// --------------------------------------------------
// CLASSE RENDERIZADOR
// --------------------------------------------------

class Renderizador {
  constructor(glContext, shaderProgram) {
    this.gl = glContext;
    this.program = shaderProgram;
    this.positionLocation = glContext.getAttribLocation(shaderProgram, "aPosition");
    this.colorLocation = glContext.getUniformLocation(shaderProgram, "uColor");
    this.transformLocation = glContext.getUniformLocation(shaderProgram, "u_transform");
    this.verticesBuffer = glContext.createBuffer();
  }

  desenhar(objeto) {
    const glContext = this.gl;

    glContext.bindBuffer(glContext.ARRAY_BUFFER, this.verticesBuffer);
    glContext.bufferData(glContext.ARRAY_BUFFER, objeto.vertices, glContext.STATIC_DRAW);
    glContext.enableVertexAttribArray(this.positionLocation);
    glContext.vertexAttribPointer(this.positionLocation, 2, glContext.FLOAT, false, 0, 0);

    glContext.uniform3fv(this.colorLocation, objeto.cor);
    glContext.uniformMatrix3fv(this.transformLocation, false, objeto.transformacaoModelo);

    glContext.drawArrays(
      glContext.TRIANGLES,
      0,
      objeto.vertices.length / 2
    );
  }

  desenharFaixa(objeto, inicioVertices, quantidadeVertices, cor, transformacao) {
    const glContext = this.gl;

    glContext.bindBuffer(glContext.ARRAY_BUFFER, this.verticesBuffer);
    glContext.bufferData(glContext.ARRAY_BUFFER, objeto.vertices, glContext.STATIC_DRAW);
    glContext.enableVertexAttribArray(this.positionLocation);
    glContext.vertexAttribPointer(this.positionLocation, 2, glContext.FLOAT, false, 0, 0);

    glContext.uniform3fv(this.colorLocation, cor);
    glContext.uniformMatrix3fv(this.transformLocation, false, transformacao);

    glContext.drawArrays(glContext.TRIANGLES, inicioVertices, quantidadeVertices);
  }
}

// --------------------------------------------------
// CLASSE OBJETO DE CENA
// --------------------------------------------------

class ObjetoCena {
  constructor(vertices, cor) {
    this.vertices = vertices;
    this.cor = cor;
    this.transformacaoModelo = m3.identity();
  }

  atualizarTransformacao(transformacao) {
    this.transformacaoModelo = transformacao;
  }

  desenhar(renderizador) {
    renderizador.desenhar(this);
  }
}

// --------------------------------------------------
// CLASSE PERNA (perna + pe, duas cores)
// --------------------------------------------------

class PernaRobo {
  constructor(vertices, corPerna, corPe) {
    this.vertices = vertices;
    this.corPerna = corPerna;
    this.corPe = corPe;
    this.transformacaoModelo = m3.identity();
  }

  atualizarTransformacao(transformacao) {
    this.transformacaoModelo = transformacao;
  }

  desenhar(renderizador) {
    renderizador.desenharFaixa(this, 0, 6, this.corPerna, this.transformacaoModelo);
    renderizador.desenharFaixa(this, 6, 6, this.corPe, this.transformacaoModelo);
  }
}

// --------------------------------------------------
// CLASSE ROBO
// --------------------------------------------------

class Robo {
  constructor() {
    this.tempo = 0.0;

    this.tronco = new ObjetoCena(
      buildVerticesRect(-0.41, -0.295, 0.41, 0.295),
      new Float32Array([0.48, 0.54, 0.64])
    );

    this.partesCabeca = [
      new ObjetoCena(buildVerticesRect(-0.34, 0.0, 0.34, 0.5), new Float32Array([0.64, 0.68, 0.76])),
      new ObjetoCena(buildVerticesRect(-0.03, 0.5, 0.03, 0.65), new Float32Array([0.85, 0.85, 0.9])),
      new ObjetoCena(buildVerticesCircle(0.0, 0.68, 0.05, 20), new Float32Array([1.0, 0.25, 0.25])),
      new ObjetoCena(buildVerticesCircle(-0.15, 0.27, 0.07, 22), new Float32Array([0.0, 0.9, 1.0])),
      new ObjetoCena(buildVerticesCircle(0.15, 0.27, 0.07, 22), new Float32Array([0.0, 0.9, 1.0])),
      new ObjetoCena(buildVerticesCircle(-0.15, 0.27, 0.03, 18), new Float32Array([0.0, 0.2, 0.3])),
      new ObjetoCena(buildVerticesCircle(0.15, 0.27, 0.03, 18), new Float32Array([0.0, 0.2, 0.3])),
      new ObjetoCena(buildVerticesRect(-0.18, 0.09, 0.18, 0.15), new Float32Array([0.18, 0.2, 0.26])),
    ];

    this.bracoEsquerdo = new ObjetoCena(
      buildVerticesRect(-0.2, -0.56, 0.0, 0.0),
      new Float32Array([0.55, 0.61, 0.7])
    );

    this.bracoDireito = new ObjetoCena(
      buildVerticesRect(0.0, -0.56, 0.2, 0.0),
      new Float32Array([0.55, 0.61, 0.7])
    );

    const verticesPernaEsq = (function () {
      const v = [];
      // perna: largura 0.2; pe centralizado no eixo, largura 0.24 (semana 1)
      pushRect(v, -0.1, -0.5, 0.1, 0.0);
      pushRect(v, -0.12, -0.6, 0.12, -0.5);
      return new Float32Array(v);
    })();

    const verticesPernaDir = (function () {
      const v = [];
      pushRect(v, -0.1, -0.5, 0.1, 0.0);
      pushRect(v, -0.12, -0.6, 0.12, -0.5);
      return new Float32Array(v);
    })();

    this.pernaEsquerda = new PernaRobo(
      verticesPernaEsq,
      new Float32Array([0.38, 0.44, 0.54]),
      new Float32Array([0.2, 0.1, 0.4])
    );

    this.pernaDireita = new PernaRobo(
      verticesPernaDir,
      new Float32Array([0.38, 0.44, 0.54]),
      new Float32Array([0.2, 0.1, 0.4])
    );

    this.escala = 0.72;
    this.posX = 0.0;
    this.posY = -0.08;
    this.velX = 0.006;
    this.meiaLargura = 0.62 * this.escala;
  }

  transformacaoMembro(base, px, py, angulo) {
    return m3.multiply(
      base,
      m3.multiply(m3.translation(px, py), m3.rotation(angulo))
    );
  }

  transformacaoBase() {
    return m3.multiply(
      m3.translation(this.posX, this.posY),
      m3.scaling(this.escala, this.escala)
    );
  }

  atualizar() {
    this.tempo += 0.016;

    this.posX += this.velX;

    if (this.posX - this.meiaLargura <= -1.0) {
      this.posX = -1.0 + this.meiaLargura;
      this.velX = Math.abs(this.velX);
    }

    if (this.posX + this.meiaLargura >= 1.0) {
      this.posX = 1.0 - this.meiaLargura;
      this.velX = -Math.abs(this.velX);
    }

    const anguloCabeca = 0.2 * Math.sin(this.tempo * 1.1);
    const anguloBracoEsquerdo = 0.35 * Math.sin(this.tempo * 2.2);
    const anguloBracoDireito = 0.35 * Math.sin(this.tempo * 2.2 + Math.PI);
    const anguloPernaEsquerda = 0.28 * Math.sin(this.tempo * 3.0 + Math.PI * 0.5);
    const anguloPernaDireita = 0.28 * Math.sin(this.tempo * 3.0 + Math.PI * 1.5);

    const base = this.transformacaoBase();

    this.tronco.atualizarTransformacao(base);

    const transformacaoCabeca = this.transformacaoMembro(base, 0.0, 0.3, anguloCabeca);
    for (let i = 0; i < this.partesCabeca.length; i += 1) {
      this.partesCabeca[i].atualizarTransformacao(transformacaoCabeca);
    }

    this.bracoEsquerdo.atualizarTransformacao(
      this.transformacaoMembro(base, -0.42, 0.21, anguloBracoEsquerdo)
    );

    this.bracoDireito.atualizarTransformacao(
      this.transformacaoMembro(base, 0.42, 0.21, anguloBracoDireito)
    );

    this.pernaEsquerda.atualizarTransformacao(
      this.transformacaoMembro(base, -0.18, -0.3, anguloPernaEsquerda)
    );

    this.pernaDireita.atualizarTransformacao(
      this.transformacaoMembro(base, 0.18, -0.3, anguloPernaDireita)
    );
  }

  desenhar(renderizador) {
    this.pernaEsquerda.desenhar(renderizador);
    this.pernaDireita.desenhar(renderizador);
    this.tronco.desenhar(renderizador);
    this.bracoEsquerdo.desenhar(renderizador);
    this.bracoDireito.desenhar(renderizador);

    for (let i = 0; i < this.partesCabeca.length; i += 1) {
      this.partesCabeca[i].desenhar(renderizador);
    }
  }
}

// --------------------------------------------------
// CLASSE CENA
// --------------------------------------------------

class Cena {
  constructor(glContext, shaderProgram) {
    this.gl = glContext;
    this.program = shaderProgram;
    this.renderizador = new Renderizador(glContext, shaderProgram);
    this.robo = new Robo();
  }

  atualizar() {
    this.robo.atualizar();
  }

  desenhar() {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.useProgram(this.program);
    this.robo.desenhar(this.renderizador);
  }

  executar() {
    this.atualizar();
    this.desenhar();
    requestAnimationFrame(() => this.executar());
  }

  iniciar() {
    requestAnimationFrame(() => this.executar());
  }
}

// --------------------------------------------------
// INICIO
// --------------------------------------------------

gl.viewport(0, 0, canvas.width, canvas.height);
gl.clearColor(0.1, 0.1, 0.1, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

const cena = new Cena(gl, program);
cena.iniciar();

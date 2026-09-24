// ==================================================
// CLASS - SCENE
// ==================================================

class Scene {

    constructor(gl, program) {

        this.renderer =
            new Renderer(gl, program);

        this.canvas = gl.canvas;
        this.escala = 0.72;

        this.helicopterBody = new HelicopterBody();

        this.helicopterTopShaft = new HelicopterTopShaft();

        this.helicopterTail = new HelicopterTail();

        this.helicopterPropellers = new HelicopterPropellers();

        this.helicopterTailPropeller = new HelicopterTailPropeller();

        this.posX = 0.0;
        this.posY = 0.0;
        this.velocidade = 0.005;
        this.margemTela = 0.02;

        // Extensão do modelo em relação ao centro (clip space -1..1)
        this.extensaoModelo = {
            esquerda: 0.8,
            direita: 0.85,
            baixo: 0.38,
            topo: 0.4,
        };

        this.anguloInclinacao = 0.0;
        this.inclinacaoMaxima = 0.22;
        this.suavizacaoInclinacao = 0.08;

        this.anguloHelicePrincipal = 0.0;
        this.anguloHeliceCauda = 0.0;
        this.velocidadeHelice = 0.07;
        this.velocidadeHeliceMovimento = 0.095;
        this.multiplicadorHeliceCauda = 2.0;

        this.teclasPressionadas = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
        };

        window.addEventListener(
            "keydown",
            (evento) => {

                if (
                    Object.prototype.hasOwnProperty.call(
                        this.teclasPressionadas,
                        evento.code
                    )
                ) {

                    this.teclasPressionadas[evento.code] = true;

                    evento.preventDefault();
                }
            }
        );

        window.addEventListener(
            "keyup",
            (evento) => {

                if (
                    Object.prototype.hasOwnProperty.call(
                        this.teclasPressionadas,
                        evento.code
                    )
                ) {

                    this.teclasPressionadas[evento.code] = false;
                }
            }
        );
    }

    estaMovendo() {

        return (
            this.teclasPressionadas.ArrowUp ||
            this.teclasPressionadas.ArrowDown ||
            this.teclasPressionadas.ArrowLeft ||
            this.teclasPressionadas.ArrowRight
        );
    }

    atualizarPosicao() {

        if (this.teclasPressionadas.ArrowUp) {
            this.posY += this.velocidade;
        }

        if (this.teclasPressionadas.ArrowDown) {
            this.posY -= this.velocidade;
        }

        if (this.teclasPressionadas.ArrowLeft) {
            this.posX -= this.velocidade;
        }

        if (this.teclasPressionadas.ArrowRight) {
            this.posX += this.velocidade;
        }

        const margem =
            this.margemTela;

        const aspecto =
            this.fatorAspecto();

        const escala =
            this.escala;

        const minX =
            (-1.0 / aspecto) +
            (this.extensaoModelo.esquerda * escala) +
            margem;

        const maxX =
            (1.0 / aspecto) -
            (this.extensaoModelo.direita * escala) -
            margem;

        const minY =
            -1.0 +
            (this.extensaoModelo.baixo * escala) +
            margem;

        const maxY =
            1.0 -
            (this.extensaoModelo.topo * escala) -
            margem;

        if (this.posX < minX) {
            this.posX = minX;
        }

        if (this.posX > maxX) {
            this.posX = maxX;
        }

        if (this.posY < minY) {
            this.posY = minY;
        }

        if (this.posY > maxY) {
            this.posY = maxY;
        }
    }

    atualizarInclinacao() {

        let inclinacaoAlvo = 0.0;

        if (this.teclasPressionadas.ArrowLeft) {
            inclinacaoAlvo = this.inclinacaoMaxima;
        } else if (this.teclasPressionadas.ArrowRight) {
            inclinacaoAlvo = -this.inclinacaoMaxima;
        }

        this.anguloInclinacao +=
            (inclinacaoAlvo - this.anguloInclinacao) *
            this.suavizacaoInclinacao;
    }

    fatorAspecto() {

        return (
            this.canvas.height /
            this.canvas.width
        );
    }

    transformacaoAspecto() {

        return m4.scaling(
            this.fatorAspecto(),
            1.0,
            1.0
        );
    }

    transformacaoMundo() {

        const posicao =
            m4.translation(
                this.posX,
                this.posY,
                0.0
            );

        const inclinacao =
            m4.zRotation(this.anguloInclinacao);

        const escalaModelo =
            m4.scaling(
                this.escala,
                this.escala,
                this.escala
            );

        const modelo =
            m4.multiply(
                inclinacao,
                escalaModelo
            );

        return m4.multiply(
            posicao,
            modelo
        );
    }

    transformacaoTela(mundo) {

        return m4.multiply(
            this.transformacaoAspecto(),
            mundo
        );
    }

    transformacaoBase() {

        return this.transformacaoTela(
            this.transformacaoMundo()
        );
    }

    giroEmPivo(px, py, pz, rotacao) {

        return m4.multiply(
            m4.translation(px, py, pz),
            m4.multiply(
                rotacao,
                m4.translation(-px, -py, -pz)
            )
        );
    }

    transformacaoComGiroHelice(px, py, pz, rotacao) {

        const giro =
            this.giroEmPivo(
                px,
                py,
                pz,
                rotacao
            );

        const escalaModelo =
            m4.scaling(
                this.escala,
                this.escala,
                this.escala
            );

        const inclinacao =
            m4.zRotation(this.anguloInclinacao);

        const posicao =
            m4.translation(
                this.posX,
                this.posY,
                0.0
            );

        const modelo =
            m4.multiply(
                inclinacao,
                m4.multiply(
                    escalaModelo,
                    giro
                )
            );

        const mundo =
            m4.multiply(
                posicao,
                modelo
            );

        return this.transformacaoTela(mundo);
    }

    update() {

        this.atualizarPosicao();
        this.atualizarInclinacao();

        const velocidadeHelices =
            this.estaMovendo()
                ? this.velocidadeHeliceMovimento
                : this.velocidadeHelice;

        this.anguloHelicePrincipal += velocidadeHelices;
        this.anguloHeliceCauda +=
            velocidadeHelices *
            this.multiplicadorHeliceCauda;

        const base =
            this.transformacaoBase();

        this.helicopterBody.update(base);
        this.helicopterTopShaft.update(base);
        this.helicopterTail.update(base);

        // Hélice principal: disco no plano XZ → gira em torno de Y
        this.helicopterPropellers.update(
            this.transformacaoComGiroHelice(
                0.0,
                0.35,
                0.0,
                m4.yRotation(this.anguloHelicePrincipal)
            )
        );

        // Hélice da cauda: disco no plano XY → gira em torno de Z
        this.helicopterTailPropeller.update(
            this.transformacaoComGiroHelice(
                0.7,
                0.0,
                0.065,
                m4.zRotation(this.anguloHeliceCauda)
            )
        );
    }

    draw() {

        gl.clear(
            gl.COLOR_BUFFER_BIT |
            gl.DEPTH_BUFFER_BIT
        );

        gl.useProgram(program);

        this.helicopterBody.draw(
            this.renderer
        );

        this.helicopterTopShaft.draw(
            this.renderer
        );

        this.helicopterTail.draw(
            this.renderer
        );

        this.helicopterPropellers.draw(
            this.renderer
        );

        this.helicopterTailPropeller.draw(
            this.renderer
        );
    }

    execute() {

        this.update();
        this.draw();

        requestAnimationFrame(
            () => this.execute()
        );
    }

    init() {

        requestAnimationFrame(
            () => this.execute()
        );
    }
}

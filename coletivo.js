/**
 * coletivo.js
 * "Modo Coletivo": tela para um dispositivo compartilhado (tablet, celular ou
 * PC fixado na entrada, por exemplo), que fica logado o dia todo com um único
 * usuário de dispositivo (perfil 'coletivo'). Cada funcionário que passa
 * digita o próprio CPF, tira a foto e o sistema registra o ponto dele — sem
 * precisar fazer login individual. É só mais uma forma de bater ponto, em
 * paralelo ao login normal de cada funcionário no próprio celular.
 */

const Coletivo = {
  configPublica: null,
  cpfAtual: '',

  async iniciar(sessao, cfg) {
    this.configPublica = cfg;
    this.voltarParaCPF();
  },

  // ------------------- ETAPA 1: CPF -------------------
  voltarParaCPF() {
    this.cpfAtual = '';
    Utils.pararCamera(document.getElementById('video-coletivo'));
    Utils.mostrar('coletivo-etapa-cpf');
    Utils.esconder('coletivo-etapa-camera');
    Utils.esconder('coletivo-etapa-resultado');
    const input = document.getElementById('coletivo-cpf');
    input.value = '';
    setTimeout(() => input.focus(), 50);
  },

  async continuarComCPF(ev) {
    ev.preventDefault();
    const cpf = document.getElementById('coletivo-cpf').value.trim();
    if (!cpf) return;
    this.cpfAtual = cpf;

    Utils.esconder('coletivo-etapa-cpf');
    Utils.mostrar('coletivo-etapa-camera');
    document.getElementById('coletivo-nome-funcionario').textContent = 'Confirme sua foto';
    Utils.mostrar('video-coletivo');
    Utils.esconder('foto-coletivo');
    Utils.esconder('btn-coletivo-confirmar');
    Utils.esconder('btn-coletivo-capturar');
    try {
      await Utils.iniciarCamera(document.getElementById('video-coletivo'));
      Utils.mostrar('btn-coletivo-capturar');
    } catch (e) {
      Utils.toast('Não foi possível acessar a câmera: ' + e.message, 'erro');
      this.voltarParaCPF();
    }
  },

  // ------------------- ETAPA 2: câmera -------------------
  capturarFotoAgora() {
    const videoEl = document.getElementById('video-coletivo');
    const foto = Utils.capturarFrame(videoEl, document.getElementById('canvas-coletivo'));
    const fotoEl = document.getElementById('foto-coletivo');
    fotoEl.src = foto;
    fotoEl.dataset.base64 = foto;
    Utils.pararCamera(videoEl);
    Utils.esconder('video-coletivo');
    Utils.esconder('btn-coletivo-capturar');
    Utils.mostrar('foto-coletivo');
    Utils.mostrar('btn-coletivo-confirmar');
  },

  cancelar() {
    this.voltarParaCPF();
  },

  async confirmarPonto() {
    const btn = document.getElementById('btn-coletivo-confirmar');
    btn.disabled = true; btn.textContent = 'Enviando...';

    const foto = document.getElementById('foto-coletivo').dataset.base64;
    const geo = await Utils.obterGeolocalizacao();

    if (this.configPublica && this.configPublica.geolocalizacaoObrigatoria && !geo) {
      Utils.toast('Não foi possível obter a localização do dispositivo. Ative o GPS e tente novamente.', 'erro');
      btn.disabled = false; btn.textContent = 'Confirmar Ponto';
      return;
    }

    const resp = await Api.chamar('pontos.registrarColetivo', {
      cpf: this.cpfAtual,
      fotoBase64: foto,
      latitude: geo ? geo.latitude : null,
      longitude: geo ? geo.longitude : null,
      precisao: geo ? geo.precisao : null,
      dispositivo: Utils.identificarDispositivo(),
      timestampCliente: new Date().toISOString()
    });

    btn.disabled = false; btn.textContent = 'Confirmar Ponto';

    if (!resp.sucesso) {
      this.mostrarResultado({
        ok: false,
        titulo: 'Não foi possível registrar',
        detalhe: resp.erro
      });
      return;
    }

    const d = resp.dados;
    const pendente = d.status === 'pendente';
    this.mostrarResultado({
      ok: !pendente,
      titulo: `${d.nomeFuncionario} — ${d.tipoPontoLabel}`,
      detalhe: pendente
        ? `Registrado às ${d.horario}. Fora do horário/local esperado: aguarda aprovação do administrador.`
        : `Registrado às ${d.horario} com sucesso!`
    });
  },

  // ------------------- ETAPA 3: resultado -------------------
  mostrarResultado({ ok, titulo, detalhe }) {
    Utils.esconder('coletivo-etapa-camera');
    Utils.mostrar('coletivo-etapa-resultado');
    document.getElementById('coletivo-resultado-icone').textContent = ok ? '✅' : (titulo.indexOf('Não foi possível registrar') === 0 ? '⚠️' : '🕒');
    document.getElementById('coletivo-resultado-titulo').textContent = titulo;
    document.getElementById('coletivo-resultado-detalhe').textContent = detalhe;

    // Volta sozinho para a tela de CPF depois de alguns segundos, pronto para o próximo funcionário.
    setTimeout(() => this.voltarParaCPF(), 4500);
  }
};

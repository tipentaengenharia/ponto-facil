/**
 * funcionario.js
 * Lógica completa da Área do Funcionário: dashboard, bater ponto
 * (foto + geolocalização + suporte offline), histórico, atestados e lembretes.
 */

const Funcionario = {
  dados: null,
  configPublica: null,
  aba: 'inicio',

  async iniciar(sessao, cfg) {
    this.dados = sessao.funcionario;
    this.configPublica = cfg;
    document.getElementById('func-nome').textContent = this.dados ? this.dados.nome : sessao.usuario;
    document.getElementById('func-cargo').textContent = this.dados ? this.dados.cargo : '';
    this.montarNav();
    await this.renderInicio();
    this.agendarLembretes();
    this.tentarSincronizarFila();
    window.addEventListener('online', () => this.tentarSincronizarFila());
    setInterval(() => this.atualizarContadorFila(), 4000);
  },

  montarNav() {
    document.querySelectorAll('#nav-funcionario button').forEach((btn) => {
      btn.addEventListener('click', () => this.trocarAba(btn.dataset.aba));
    });
  },

  async trocarAba(aba) {
    this.aba = aba;
    document.querySelectorAll('#nav-funcionario button').forEach((b) => b.classList.toggle('ativo', b.dataset.aba === aba));
    ['inicio', 'historico', 'atestado', 'ferias'].forEach((a) => Utils.esconder('func-aba-' + a));
    Utils.mostrar('func-aba-' + aba);
    if (aba === 'historico') await this.renderHistorico();
    if (aba === 'atestado') await this.renderAtestados();
    if (aba === 'ferias') await this.renderFerias();
  },

  async proximoPontoEsperado() {
    const seq = ['entrada', 'saida_almoco', 'retorno_almoco', 'saida_final', 'entrada_extra', 'saida_extra'];
    const labels = { entrada: 'Entrada', saida_almoco: 'Saída Almoço', retorno_almoco: 'Retorno Almoço', saida_final: 'Saída Final', entrada_extra: 'Entrada Extra', saida_extra: 'Saída Extra' };
    const hoje = new Date().toISOString().slice(0, 10);
    const resp = await Api.chamar('pontos.meus', { dataInicio: hoje, dataFim: hoje });
    const jaBatidos = resp.sucesso ? resp.dados.filter((p) => p.StatusPonto !== 'rejeitado').map((p) => p.TipoPonto) : [];
    const proximo = seq.find((t) => jaBatidos.indexOf(t) === -1);
    return { tipo: proximo, label: proximo ? labels[proximo] : 'Dia completo', pontosHoje: resp.sucesso ? resp.dados : [] };
  },

  async renderInicio() {
    const info = await this.proximoPontoEsperado();
    document.getElementById('proximo-ponto-label').textContent = info.label;
    document.getElementById('btn-bater-ponto').disabled = !info.tipo;
    document.getElementById('btn-bater-ponto').dataset.tipo = info.tipo || '';

    const lista = document.getElementById('pontos-hoje-lista');
    lista.innerHTML = '';
    info.pontosHoje.forEach((p) => {
      const li = document.createElement('div');
      li.innerHTML = `<strong>${p.HorarioRegistrado}</strong> — ${p.TipoPonto.replace('_', ' ')} <span class="badge badge-${p.StatusPonto}">${p.StatusPonto}</span>`;
      lista.appendChild(li);
    });
    await this.atualizarContadorFila();
  },

  async atualizarContadorFila() {
    const n = await contarPontosOffline();
    const el = document.getElementById('contador-offline');
    if (n > 0) {
      el.textContent = `${n} ponto(s) aguardando sincronização`;
      Utils.mostrar('contador-offline');
    } else {
      Utils.esconder('contador-offline');
    }
  },

  // ------------------- BATER PONTO -------------------
  /** Abre o modal e liga a câmera, mostrando o preview ao vivo para o funcionário se posicionar. */
  async abrirCamera() {
    Utils.mostrar('modal-ponto');
    Utils.mostrar('video-camera');
    Utils.esconder('foto-capturada');
    Utils.esconder('btn-confirmar-ponto');
    Utils.esconder('btn-capturar-foto');
    try {
      await Utils.iniciarCamera(document.getElementById('video-camera'));
      Utils.mostrar('btn-capturar-foto');
    } catch (e) {
      Utils.toast('Não foi possível acessar a câmera: ' + e.message, 'erro');
      this.fecharModalPonto();
    }
  },

  /** Chamado quando o funcionário já se posicionou e clica em "Bater Foto". */
  capturarFotoAgora() {
    const videoEl = document.getElementById('video-camera');
    const foto = Utils.capturarFrame(videoEl, document.getElementById('canvas-foto'));
    document.getElementById('foto-capturada').src = foto;
    document.getElementById('foto-capturada').dataset.base64 = foto;
    Utils.pararCamera(videoEl);
    Utils.esconder('video-camera');
    Utils.esconder('btn-capturar-foto');
    Utils.mostrar('foto-capturada');
    Utils.mostrar('btn-confirmar-ponto');
  },

  fecharModalPonto() {
    Utils.pararCamera(document.getElementById('video-camera'));
    Utils.mostrar('video-camera');
    Utils.esconder('foto-capturada');
    Utils.esconder('btn-confirmar-ponto');
    Utils.esconder('btn-capturar-foto');
    Utils.esconder('modal-ponto');
  },

  async confirmarPonto() {
    const btn = document.getElementById('btn-confirmar-ponto');
    btn.disabled = true; btn.textContent = 'Enviando...';

    const foto = document.getElementById('foto-capturada').dataset.base64;
    const geo = await Utils.obterGeolocalizacao();
    const dadosPonto = {
      idClienteTemp: Utils.uuid(),
      fotoBase64: foto,
      latitude: geo ? geo.latitude : null,
      longitude: geo ? geo.longitude : null,
      precisao: geo ? geo.precisao : null,
      dispositivo: Utils.identificarDispositivo(),
      timestampCliente: new Date().toISOString()
    };

    if (this.configPublica.geolocalizacaoObrigatoria && !geo) {
      Utils.toast('Não foi possível obter sua localização. Ative o GPS e tente novamente.', 'erro');
      btn.disabled = false; btn.textContent = 'Confirmar Ponto';
      return;
    }

    if (navigator.onLine) {
      const resp = await Api.chamar('pontos.registrar', dadosPonto);
      if (resp.sucesso) {
        if (resp.dados.status === 'pendente') {
          Utils.toast(`Ponto "${resp.dados.tipoPontoLabel}" registrado às ${resp.dados.horario}. Está fora do horário/local esperado e aguarda aprovação do administrador.`, 'aviso');
        } else {
          Utils.toast(`Ponto "${resp.dados.tipoPontoLabel}" registrado às ${resp.dados.horario}!`, 'sucesso');
        }
        this.fecharModalPonto();
        await this.renderInicio();
        btn.disabled = false; btn.textContent = 'Confirmar Ponto';
        return;
      }
      if (resp.codigo !== 'OFFLINE' && !resp.excecao) {
        Utils.toast(resp.erro, 'erro');
        btn.disabled = false; btn.textContent = 'Confirmar Ponto';
        return;
      }
      // Se caiu aqui: exceção de rede mesmo estando "online" -> cai para fila offline
    }

    // OFFLINE: guarda localmente e mostra confirmação de pendência
    if (!this.configPublica.permitePontoOffline) {
      Utils.toast('Sem conexão e o registro offline está desabilitado para esta empresa.', 'erro');
      btn.disabled = false; btn.textContent = 'Confirmar Ponto';
      return;
    }
    dadosPonto.origem = 'offline';
    await salvarPontoOffline(dadosPonto);
    Utils.toast('Sem internet: ponto salvo no dispositivo e será sincronizado automaticamente.', 'aviso');
    this.fecharModalPonto();
    await this.renderInicio();
    btn.disabled = false; btn.textContent = 'Confirmar Ponto';
  },

  async tentarSincronizarFila() {
    if (!navigator.onLine) return;
    const fila = await listarPontosOffline();
    if (!fila.length) return;
    const resp = await Api.chamar('pontos.sincronizarOffline', { pontos: fila });
    if (!resp.sucesso) return;
    for (const r of resp.dados.resultados) {
      if (r.sucesso) await removerPontoOffline(r.idClienteTemp);
    }
    const restantes = await contarPontosOffline();
    if (restantes === 0 && fila.length > 0) Utils.toast('Pontos offline sincronizados com sucesso!', 'sucesso');
    await this.renderInicio();
  },

  // ------------------- HISTÓRICO -------------------
  async renderHistorico(dataInicio, dataFim) {
    const hoje = new Date();
    const inicioPadrao = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
    dataInicio = dataInicio || document.getElementById('hist-data-inicio').value || inicioPadrao;
    dataFim = dataFim || document.getElementById('hist-data-fim').value || hoje.toISOString().slice(0, 10);
    document.getElementById('hist-data-inicio').value = dataInicio;
    document.getElementById('hist-data-fim').value = dataFim;

    const resp = await Api.chamar('pontos.meus', { dataInicio, dataFim });
    const corpo = document.getElementById('tabela-historico-corpo');
    corpo.innerHTML = '';
    if (!resp.sucesso) return;
    resp.dados.forEach((p) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${Utils.formatarDataBR(p.Data)}</td><td>${p.DiaSemana}</td><td>${p.TipoPonto.replace('_', ' ')}</td>
        <td>${p.HorarioRegistrado}</td><td>${p.HorarioEsperado || '-'}</td>
        <td><span class="badge badge-${p.StatusPonto}">${p.StatusPonto}</span></td>
        <td>${p.Origem === 'offline' ? '📴 offline' : '🌐 online'}</td>`;
      corpo.appendChild(tr);
    });
  },

  // ------------------- ATESTADOS -------------------
  async renderAtestados() {
    const resp = await Api.chamar('atestados.listar', {});
    const corpo = document.getElementById('tabela-atestados-corpo');
    corpo.innerHTML = '';
    if (!resp.sucesso) return;
    resp.dados.forEach((a) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${Utils.formatarDataBR(a.DataInicial)} a ${Utils.formatarDataBR(a.DataFinal)}</td>
        <td>${a.QuantidadeDias}</td><td><span class="badge badge-${a.Status}">${a.Status.replace('_', ' ')}</span></td>
        <td><a href="${a.LinkArquivo}" target="_blank">ver arquivo</a></td>`;
      corpo.appendChild(tr);
    });
  },

  async enviarAtestado(ev) {
    ev.preventDefault();
    const dataInicial = document.getElementById('atestado-inicio').value;
    const dataFinal = document.getElementById('atestado-fim').value;
    const observacao = document.getElementById('atestado-obs').value;
    const arquivoInput = document.getElementById('atestado-arquivo');
    if (!arquivoInput.files.length) { Utils.toast('Selecione um arquivo.', 'erro'); return; }
    const arquivo = arquivoInput.files[0];
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(arquivo);
    });
    const resp = await Api.chamar('atestados.enviar', {
      dataInicial, dataFinal, observacao, arquivoBase64: base64, mimeType: arquivo.type
    });
    if (!resp.sucesso) { Utils.toast(resp.erro, 'erro'); return; }
    Utils.toast('Atestado enviado com sucesso!', 'sucesso');
    document.getElementById('form-atestado').reset();
    await this.renderAtestados();
  },

  // ------------------- FÉRIAS -------------------
  async renderFerias() {
    const resp = await Api.chamar('ferias.listar', {});
    const corpo = document.getElementById('tabela-ferias-corpo');
    corpo.innerHTML = '';
    if (!resp.sucesso) return;
    resp.dados.forEach((f) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${Utils.formatarDataBR(f.DataInicial)} a ${Utils.formatarDataBR(f.DataFinal)}</td>
        <td>${f.QuantidadeDias}</td><td><span class="badge badge-${f.Status}">${f.Status}</span></td>`;
      corpo.appendChild(tr);
    });
  },

  // ------------------- LEMBRETES -------------------
  agendarLembretes() {
    if (!this.configPublica || !this.dados) return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    const horarios = [this.dados.jornada.entrada, this.dados.jornada.saidaAlmoco, this.dados.jornada.retornoAlmoco, this.dados.jornada.saidaFinal];
    const jaAvisadoNesteMinuto = {};
    setInterval(() => {
      const agora = new Date();
      const hhmm = agora.toTimeString().slice(0, 5);
      if (horarios.indexOf(hhmm) !== -1 && !jaAvisadoNesteMinuto[hhmm]) {
        jaAvisadoNesteMinuto[hhmm] = true;
        setTimeout(() => { delete jaAvisadoNesteMinuto[hhmm]; }, 65000);
        this.notificar('Hora de bater o ponto', 'Está na hora do seu registro de ' + hhmm + '.');
      }
    }, 15000);
  },

  notificar(titulo, corpo) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(titulo, { body: corpo, icon: 'icons/icon-192.png' });
    } else {
      Utils.toast(titulo + ': ' + corpo, 'aviso');
    }
  }
};

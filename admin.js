/**
 * admin.js
 * Lógica completa da Área Administrativa: dashboard, funcionários, locais,
 * pontos (aprovação/correção), férias, atestados e relatórios.
 */

const Admin = {
  funcionariosCache: [],
  locaisCache: [],

  async iniciar() {
    document.querySelectorAll('#nav-admin button[data-aba]').forEach((btn) => {
      btn.addEventListener('click', () => this.trocarAba(btn.dataset.aba));
    });
    await this.trocarAba('dashboard');
  },

  async trocarAba(aba) {
    if (!aba) return;
    document.querySelectorAll('#nav-admin button[data-aba]').forEach((b) => b.classList.toggle('ativo', b.dataset.aba === aba));
    document.querySelectorAll('.admin-aba').forEach((el) => el.classList.add('oculto'));
    Utils.mostrar('admin-aba-' + aba);
    const mapa = {
      dashboard: () => this.renderDashboard(),
      funcionarios: () => this.renderFuncionarios(),
      locais: () => this.renderLocais(),
      pontos: () => this.renderPontos(),
      ferias: () => this.renderFerias(),
      atestados: () => this.renderAtestados(),
      relatorios: () => this.renderRelatoriosFiltros()
    };
    if (mapa[aba]) await mapa[aba]();
  },

  // ==================== DASHBOARD ====================
  async renderDashboard() {
    const resp = await Api.chamar('dashboard.resumo', {});
    if (!resp.sucesso) return Utils.toast(resp.erro, 'erro');
    const d = resp.dados;
    document.getElementById('dash-cards').innerHTML = `
      <div class="stat-card"><div class="valor">${d.totalFuncionarios}</div><div class="rotulo">Funcionários ativos</div></div>
      <div class="stat-card"><div class="valor">${d.presentesHoje}</div><div class="rotulo">Presentes hoje</div></div>
      <div class="stat-card"><div class="valor">${d.atrasadosHoje}</div><div class="rotulo">Atrasados hoje</div></div>
      <div class="stat-card"><div class="valor">${d.ausentesHoje}</div><div class="rotulo">Ausentes hoje</div></div>
      <div class="stat-card"><div class="valor">${d.pontosPendentesAprovacao}</div><div class="rotulo">Pontos p/ aprovar</div></div>
      <div class="stat-card"><div class="valor">${d.justificativasPendentes}</div><div class="rotulo">Justificativas pendentes</div></div>
      <div class="stat-card"><div class="valor">${d.atestadosPendentes}</div><div class="rotulo">Atestados em análise</div></div>
      <div class="stat-card"><div class="valor">${d.feriasAtivas}</div><div class="rotulo">Férias ativas</div></div>
    `;
    document.getElementById('dash-ausentes').textContent = d.ausentesNomes.join(', ') || 'Nenhum';
    document.getElementById('dash-ferias').textContent = d.feriasAtivasNomes.join(', ') || 'Nenhuma';
  },

  // ==================== FUNCIONÁRIOS ====================
  async renderFuncionarios() {
    const resp = await Api.chamar('funcionarios.listar', {});
    if (!resp.sucesso) return Utils.toast(resp.erro, 'erro');
    this.funcionariosCache = resp.dados;
    const corpo = document.getElementById('tabela-funcionarios-corpo');
    corpo.innerHTML = '';
    resp.dados.forEach((f) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${f.NomeCompleto}</td><td>${f.Cargo}</td><td>${f.Departamento}</td><td>${f.Usuario}</td>
        <td><span class="badge badge-${f.Status}">${f.Status}</span></td>
        <td>
          <button class="pequeno secundario" data-acao="editar" data-id="${f.ID}">Editar</button>
          <button class="pequeno secundario" data-acao="senha" data-id="${f.ID}">Redefinir senha</button>
          <button class="pequeno ${f.Status === 'ativo' ? 'perigo' : 'sucesso'}" data-acao="status" data-id="${f.ID}" data-status="${f.Status === 'ativo' ? 'inativo' : 'ativo'}">${f.Status === 'ativo' ? 'Desativar' : 'Ativar'}</button>
        </td>`;
      corpo.appendChild(tr);
    });
    corpo.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => this.acaoFuncionario(btn)));
  },

  async acaoFuncionario(btn) {
    const id = btn.dataset.id;
    if (btn.dataset.acao === 'status') {
      const resp = await Api.chamar('funcionarios.status', { id, status: btn.dataset.status });
      if (!resp.sucesso) return Utils.toast(resp.erro, 'erro');
      Utils.toast('Status atualizado.', 'sucesso');
      await this.renderFuncionarios();
    }
    if (btn.dataset.acao === 'senha') {
      const nova = prompt('Nova senha (deixe em branco para gerar automaticamente):');
      const resp = await Api.chamar('funcionarios.redefinirSenha', { funcionarioId: id, novaSenha: nova || undefined });
      if (!resp.sucesso) return Utils.toast(resp.erro, 'erro');
      alert('Nova senha do funcionário: ' + resp.dados.novaSenha);
    }
    if (btn.dataset.acao === 'editar') this.abrirModalFuncionario(this.funcionariosCache.find((f) => f.ID === id));
  },

  abrirModalFuncionario(func) {
    const editando = !!func;
    document.getElementById('modal-funcionario-titulo').textContent = editando ? 'Editar Funcionário' : 'Novo Funcionário';
    const f = func || {};
    document.getElementById('ffunc-id').value = f.ID || '';
    document.getElementById('ffunc-nome').value = f.NomeCompleto || '';
    document.getElementById('ffunc-cpf').value = f.CPF || '';
    document.getElementById('ffunc-cargo').value = f.Cargo || '';
    document.getElementById('ffunc-depto').value = f.Departamento || '';
    document.getElementById('ffunc-email').value = f.Email || '';
    document.getElementById('ffunc-telefone').value = f.Telefone || '';
    document.getElementById('ffunc-usuario').value = f.Usuario || '';
    document.getElementById('ffunc-usuario').disabled = editando;
    document.getElementById('ffunc-senha-linha').classList.toggle('oculto', editando);
    document.getElementById('ffunc-entrada').value = f.HoraEntrada || '08:00';
    document.getElementById('ffunc-saida-almoco').value = f.HoraSaidaAlmoco || '12:00';
    document.getElementById('ffunc-retorno-almoco').value = f.HoraRetornoAlmoco || '13:00';
    document.getElementById('ffunc-saida-final').value = f.HoraSaidaFinal || '17:00';
    document.getElementById('ffunc-carga-diaria').value = f.CargaDiaria || '08:00';
    document.getElementById('ffunc-carga-semanal').value = f.CargaSemanal || '44:00';
    document.getElementById('ffunc-admissao').value = f.DataAdmissao || new Date().toISOString().slice(0, 10);
    document.getElementById('ffunc-obs').value = f.Observacoes || '';
    document.getElementById('ffunc-offline').checked = editando ? String(f.PermiteOffline) === 'true' : true;
    const dias = (f.DiasTrabalhados || 'Seg,Ter,Qua,Qui,Sex').split(',');
    document.querySelectorAll('.ffunc-dia').forEach((cb) => { cb.checked = dias.indexOf(cb.value) !== -1; });

    const selectLocais = document.getElementById('ffunc-locais');
    selectLocais.innerHTML = this.locaisCache.map((l) => `<option value="${l.ID}">${l.Nome}</option>`).join('');
    const locaisAtuais = (f.LocaisAutorizados || '').split(',');
    Array.from(selectLocais.options).forEach((op) => { op.selected = locaisAtuais.indexOf(op.value) !== -1; });

    Utils.mostrar('modal-funcionario');
  },

  async salvarFuncionario(ev) {
    ev.preventDefault();
    const id = document.getElementById('ffunc-id').value;
    const corpo = {
      nomeCompleto: document.getElementById('ffunc-nome').value,
      cpf: document.getElementById('ffunc-cpf').value,
      cargo: document.getElementById('ffunc-cargo').value,
      departamento: document.getElementById('ffunc-depto').value,
      email: document.getElementById('ffunc-email').value,
      telefone: document.getElementById('ffunc-telefone').value,
      horaEntrada: document.getElementById('ffunc-entrada').value,
      horaSaidaAlmoco: document.getElementById('ffunc-saida-almoco').value,
      horaRetornoAlmoco: document.getElementById('ffunc-retorno-almoco').value,
      horaSaidaFinal: document.getElementById('ffunc-saida-final').value,
      cargaDiaria: document.getElementById('ffunc-carga-diaria').value,
      cargaSemanal: document.getElementById('ffunc-carga-semanal').value,
      dataAdmissao: document.getElementById('ffunc-admissao').value,
      observacoes: document.getElementById('ffunc-obs').value,
      permiteOffline: document.getElementById('ffunc-offline').checked,
      diasTrabalhados: Array.from(document.querySelectorAll('.ffunc-dia:checked')).map((cb) => cb.value),
      locaisAutorizados: Array.from(document.getElementById('ffunc-locais').selectedOptions).map((o) => o.value)
    };
    let resp;
    if (id) {
      corpo.id = id;
      resp = await Api.chamar('funcionarios.editar', corpo);
    } else {
      corpo.usuario = document.getElementById('ffunc-usuario').value;
      corpo.senha = document.getElementById('ffunc-senha').value;
      resp = await Api.chamar('funcionarios.criar', corpo);
    }
    if (!resp.sucesso) return Utils.toast(resp.erro, 'erro');
    Utils.toast('Funcionário salvo com sucesso.', 'sucesso');
    Utils.esconder('modal-funcionario');
    await this.renderFuncionarios();
  },

  // ==================== LOCAIS ====================
  async renderLocais() {
    const resp = await Api.chamar('locais.listar', {});
    if (!resp.sucesso) return Utils.toast(resp.erro, 'erro');
    this.locaisCache = resp.dados;
    const corpo = document.getElementById('tabela-locais-corpo');
    corpo.innerHTML = '';
    resp.dados.forEach((l) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${l.Nome}</td><td>${l.Endereco || ''}</td><td>${l.Latitude}, ${l.Longitude}</td><td>${l.RaioMetros}m</td>
        <td><span class="badge badge-${l.Status}">${l.Status}</span></td>
        <td><button class="pequeno secundario" data-id="${l.ID}">Editar</button></td>`;
      tr.querySelector('button').addEventListener('click', () => this.abrirModalLocal(l));
      corpo.appendChild(tr);
    });
  },

  abrirModalLocal(local) {
    const l = local || {};
    document.getElementById('modal-local-titulo').textContent = local ? 'Editar Local' : 'Novo Local';
    document.getElementById('floc-id').value = l.ID || '';
    document.getElementById('floc-nome').value = l.Nome || '';
    document.getElementById('floc-endereco').value = l.Endereco || '';
    document.getElementById('floc-lat').value = l.Latitude || '';
    document.getElementById('floc-lng').value = l.Longitude || '';
    document.getElementById('floc-raio').value = l.RaioMetros || 100;
    document.getElementById('floc-status').value = l.Status || 'ativo';
    document.getElementById('floc-obs').value = l.Observacoes || '';
    Utils.mostrar('modal-local');
  },

  usarMinhaLocalizacao() {
    Utils.obterGeolocalizacao().then((geo) => {
      if (!geo) return Utils.toast('Não foi possível obter a localização atual.', 'erro');
      document.getElementById('floc-lat').value = geo.latitude;
      document.getElementById('floc-lng').value = geo.longitude;
      Utils.toast('Localização atual preenchida.', 'sucesso');
    });
  },

  async salvarLocal(ev) {
    ev.preventDefault();
    const corpo = {
      id: document.getElementById('floc-id').value || undefined,
      nome: document.getElementById('floc-nome').value,
      endereco: document.getElementById('floc-endereco').value,
      latitude: Number(document.getElementById('floc-lat').value),
      longitude: Number(document.getElementById('floc-lng').value),
      raioMetros: Number(document.getElementById('floc-raio').value),
      status: document.getElementById('floc-status').value,
      observacoes: document.getElementById('floc-obs').value
    };
    const resp = await Api.chamar('locais.salvar', corpo);
    if (!resp.sucesso) return Utils.toast(resp.erro, 'erro');
    Utils.toast('Local salvo com sucesso.', 'sucesso');
    Utils.esconder('modal-local');
    await this.renderLocais();
  },

  // ==================== PONTOS ====================
  async renderPontos() {
    const selFunc = document.getElementById('filtro-ponto-func');
    if (!selFunc.dataset.preenchido) {
      selFunc.innerHTML = '<option value="">Todos</option>' + this.funcionariosCache.map((f) => `<option value="${f.ID}">${f.NomeCompleto}</option>`).join('');
      selFunc.dataset.preenchido = '1';
    }
    const filtros = {
      funcionarioId: selFunc.value || undefined,
      status: document.getElementById('filtro-ponto-status').value || undefined,
      dataInicio: document.getElementById('filtro-ponto-inicio').value || undefined,
      dataFim: document.getElementById('filtro-ponto-fim').value || undefined
    };
    const resp = await Api.chamar('pontos.listar', filtros);
    if (!resp.sucesso) return Utils.toast(resp.erro, 'erro');
    const corpo = document.getElementById('tabela-pontos-corpo');
    corpo.innerHTML = '';
    resp.dados.forEach((p) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${Utils.formatarDataBR(p.Data)}</td><td>${p.NomeFuncionario}</td><td>${p.TipoPonto.replace('_', ' ')}</td>
        <td>${p.HorarioRegistrado}</td><td>${p.DistanciaLocal !== '' ? p.DistanciaLocal + 'm' : '-'}</td>
        <td><span class="badge badge-${p.StatusPonto}">${p.StatusPonto}</span></td>
        <td>${p.Origem === 'offline' ? '📴' : '🌐'}</td>
        <td>${p.LinkFoto ? `<a href="${p.LinkFoto}" target="_blank">ver foto</a>` : '-'}</td>
        <td>
          <button class="pequeno sucesso" data-acao="aprovar" data-id="${p.ID}">✔</button>
          <button class="pequeno perigo" data-acao="rejeitar" data-id="${p.ID}">✘</button>
          <button class="pequeno secundario" data-acao="corrigir" data-id="${p.ID}" data-horario="${p.HorarioRegistrado}">✎</button>
        </td>`;
      corpo.appendChild(tr);
    });
    corpo.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => this.acaoPonto(btn)));
  },

  async acaoPonto(btn) {
    const id = btn.dataset.id;
    if (btn.dataset.acao === 'aprovar') {
      const resp = await Api.chamar('pontos.aprovar', { id });
      if (!resp.sucesso) return Utils.toast(resp.erro, 'erro');
      Utils.toast('Ponto aprovado.', 'sucesso');
    } else if (btn.dataset.acao === 'rejeitar') {
      const obs = prompt('Motivo da rejeição (opcional):') || '';
      const resp = await Api.chamar('pontos.rejeitar', { id, observacao: obs });
      if (!resp.sucesso) return Utils.toast(resp.erro, 'erro');
      Utils.toast('Ponto rejeitado.', 'sucesso');
    } else if (btn.dataset.acao === 'corrigir') {
      const novoHorario = prompt('Novo horário (HH:mm):', btn.dataset.horario);
      if (!novoHorario) return;
      const resp = await Api.chamar('pontos.corrigir', { id, horarioRegistrado: novoHorario });
      if (!resp.sucesso) return Utils.toast(resp.erro, 'erro');
      Utils.toast('Ponto corrigido.', 'sucesso');
    }
    await this.renderPontos();
  },

  // ==================== FÉRIAS ====================
  async renderFerias() {
    const selFunc = document.getElementById('ferias-func');
    if (!selFunc.dataset.preenchido) {
      selFunc.innerHTML = this.funcionariosCache.map((f) => `<option value="${f.ID}">${f.NomeCompleto}</option>`).join('');
      selFunc.dataset.preenchido = '1';
    }
    const resp = await Api.chamar('ferias.listar', {});
    if (!resp.sucesso) return Utils.toast(resp.erro, 'erro');
    const corpo = document.getElementById('tabela-ferias-admin-corpo');
    corpo.innerHTML = '';
    resp.dados.forEach((f) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${f.NomeFuncionario}</td><td>${Utils.formatarDataBR(f.DataInicial)} a ${Utils.formatarDataBR(f.DataFinal)}</td>
        <td>${f.QuantidadeDias}</td><td><span class="badge badge-${f.Status}">${f.Status}</span></td>
        <td>${f.Status === 'aprovada' ? `<button class="pequeno perigo" data-id="${f.ID}">Cancelar</button>` : ''}</td>`;
      const btn = tr.querySelector('button');
      if (btn) btn.addEventListener('click', async () => {
        const r = await Api.chamar('ferias.cancelar', { id: f.ID });
        if (r.sucesso) { Utils.toast('Férias canceladas.', 'sucesso'); this.renderFerias(); }
      });
      corpo.appendChild(tr);
    });
  },

  async solicitarFerias(ev) {
    ev.preventDefault();
    const corpo = {
      funcionarioId: document.getElementById('ferias-func').value,
      dataInicial: document.getElementById('ferias-inicio').value,
      dataFinal: document.getElementById('ferias-fim').value,
      observacao: document.getElementById('ferias-obs').value
    };
    const resp = await Api.chamar('ferias.solicitar', corpo);
    if (!resp.sucesso) return Utils.toast(resp.erro, 'erro');
    Utils.toast('Férias cadastradas.', 'sucesso');
    document.getElementById('form-ferias').reset();
    await this.renderFerias();
  },

  // ==================== ATESTADOS ====================
  async renderAtestados() {
    const resp = await Api.chamar('atestados.listar', {});
    if (!resp.sucesso) return Utils.toast(resp.erro, 'erro');
    const corpo = document.getElementById('tabela-atestados-admin-corpo');
    corpo.innerHTML = '';
    resp.dados.forEach((a) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${a.NomeFuncionario}</td><td>${Utils.formatarDataBR(a.DataInicial)} a ${Utils.formatarDataBR(a.DataFinal)}</td>
        <td>${a.QuantidadeDias}</td><td><a href="${a.LinkArquivo}" target="_blank">arquivo</a></td>
        <td><span class="badge badge-${a.Status}">${a.Status.replace('_', ' ')}</span></td>
        <td>
          <button class="pequeno sucesso" data-acao="aprovado" data-id="${a.ID}">Aprovar</button>
          <button class="pequeno perigo" data-acao="rejeitado" data-id="${a.ID}">Rejeitar</button>
        </td>`;
      tr.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', async () => {
        const r = await Api.chamar('atestados.analisar', { id: a.ID, status: btn.dataset.acao });
        if (r.sucesso) { Utils.toast('Atestado atualizado.', 'sucesso'); this.renderAtestados(); }
      }));
      corpo.appendChild(tr);
    });
  },

  // ==================== RELATÓRIOS ====================
  async renderRelatoriosFiltros() {
    const selFunc = document.getElementById('rel-func');
    if (!selFunc.dataset.preenchido) {
      selFunc.innerHTML = '<option value="">Todos</option>' + this.funcionariosCache.map((f) => `<option value="${f.ID}">${f.NomeCompleto}</option>`).join('');
      selFunc.dataset.preenchido = '1';
    }
  },

  _ultimoRelatorio: null,

  async gerarRelatorio() {
    const corpo = {
      funcionarioId: document.getElementById('rel-func').value || undefined,
      departamento: document.getElementById('rel-depto').value || undefined,
      dataInicio: document.getElementById('rel-inicio').value || undefined,
      dataFim: document.getElementById('rel-fim').value || undefined
    };
    const resp = await Api.chamar('relatorios.gerar', corpo);
    if (!resp.sucesso) return Utils.toast(resp.erro, 'erro');
    this._ultimoRelatorio = resp.dados;
    const r = resp.dados.resumo;
    document.getElementById('rel-resumo').innerHTML = `
      <div class="stat-card"><div class="valor">${r.diasTrabalhados}</div><div class="rotulo">Dias trabalhados</div></div>
      <div class="stat-card"><div class="valor">${r.totalHoras}</div><div class="rotulo">Total horas</div></div>
      <div class="stat-card"><div class="valor">${r.totalExtra}</div><div class="rotulo">Horas extras</div></div>
      <div class="stat-card"><div class="valor">${r.atrasos}</div><div class="rotulo">Atrasos</div></div>
      <div class="stat-card"><div class="valor">${r.faltas}</div><div class="rotulo">Faltas</div></div>
      <div class="stat-card"><div class="valor">${r.diasFerias}</div><div class="rotulo">Dias de férias</div></div>
      <div class="stat-card"><div class="valor">${r.diasAtestado}</div><div class="rotulo">Dias c/ atestado</div></div>
      <div class="stat-card"><div class="valor">${r.saldoBanco}</div><div class="rotulo">Saldo banco de horas</div></div>
    `;
    const corpoTabela = document.getElementById('tabela-relatorio-corpo');
    corpoTabela.innerHTML = '';
    resp.dados.linhas.forEach((l) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${l.nome}</td><td>${Utils.formatarDataBR(l.data)}</td><td>${l.diaSemana}</td>
        <td>${l.entrada}</td><td>${l.saidaAlmoco}</td><td>${l.retornoAlmoco}</td><td>${l.saidaFinal}</td>
        <td>${l.totalTrabalhado}</td><td>${l.totalExtra}</td>
        <td>${l.falta ? '⚠ Falta' : l.ferias ? 'Férias' : l.atestado ? 'Atestado' : l.atraso ? 'Atraso' : 'OK'}</td>
        <td>${l.saldoBanco}</td>`;
      corpoTabela.appendChild(tr);
    });
    Utils.mostrar('rel-resultado');
  },

  exportarCSV() {
    if (!this._ultimoRelatorio) return Utils.toast('Gere o relatório primeiro.', 'erro');
    const cab = ['Funcionário', 'Departamento', 'Data', 'Dia', 'Entrada', 'Saída Almoço', 'Retorno Almoço', 'Saída Final', 'Total Trabalhado', 'Total Extra', 'Situação', 'Saldo Banco'];
    const linhas = this._ultimoRelatorio.linhas.map((l) => [l.nome, l.departamento, l.data, l.diaSemana, l.entrada, l.saidaAlmoco, l.retornoAlmoco, l.saidaFinal, l.totalTrabalhado, l.totalExtra, l.falta ? 'Falta' : l.ferias ? 'Férias' : l.atestado ? 'Atestado' : 'OK', l.saldoBanco]);
    Utils.baixarCSV('relatorio_ponto.csv', cab, linhas);
  },

  exportarXLSX() {
    if (!this._ultimoRelatorio) return Utils.toast('Gere o relatório primeiro.', 'erro');
    const cab = ['Funcionário', 'Departamento', 'Data', 'Dia', 'Entrada', 'Saída Almoço', 'Retorno Almoço', 'Saída Final', 'Total Trabalhado', 'Total Extra', 'Situação', 'Saldo Banco'];
    const linhas = this._ultimoRelatorio.linhas.map((l) => [l.nome, l.departamento, l.data, l.diaSemana, l.entrada, l.saidaAlmoco, l.retornoAlmoco, l.saidaFinal, l.totalTrabalhado, l.totalExtra, l.falta ? 'Falta' : l.ferias ? 'Férias' : l.atestado ? 'Atestado' : 'OK', l.saldoBanco]);
    const ws = XLSX.utils.aoa_to_sheet([cab, ...linhas]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    XLSX.writeFile(wb, 'relatorio_ponto.xlsx');
  },

  exportarPDF() {
    if (!this._ultimoRelatorio) return Utils.toast('Gere o relatório primeiro.', 'erro');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text('Relatório de Ponto - ' + this._ultimoRelatorio.periodo.inicio + ' a ' + this._ultimoRelatorio.periodo.fim, 14, 12);
    doc.autoTable({
      startY: 18,
      head: [['Funcionário', 'Data', 'Dia', 'Entrada', 'S.Almoço', 'R.Almoço', 'Saída', 'Total', 'Extra', 'Situação']],
      body: this._ultimoRelatorio.linhas.map((l) => [l.nome, Utils.formatarDataBR(l.data), l.diaSemana, l.entrada, l.saidaAlmoco, l.retornoAlmoco, l.saidaFinal, l.totalTrabalhado, l.totalExtra, l.falta ? 'Falta' : l.ferias ? 'Férias' : l.atestado ? 'Atestado' : 'OK']),
      styles: { fontSize: 7 }
    });
    doc.save('relatorio_ponto.pdf');
  },

  async exportarGoogleSheets() {
    const corpo = {
      funcionarioId: document.getElementById('rel-func').value || undefined,
      departamento: document.getElementById('rel-depto').value || undefined,
      dataInicio: document.getElementById('rel-inicio').value || undefined,
      dataFim: document.getElementById('rel-fim').value || undefined
    };
    Utils.toast('Gerando planilha no Google Sheets...', 'info');
    const resp = await Api.chamar('relatorios.exportarSheet', corpo);
    if (!resp.sucesso) return Utils.toast(resp.erro, 'erro');
    window.open(resp.dados.url, '_blank');
  }
};

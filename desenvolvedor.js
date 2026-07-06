/**
 * desenvolvedor.js
 * Área do Desenvolvedor: configurações globais do sistema (identidade
 * visual, planilha/pastas do Drive, regras de negócio, mensagens).
 */

const Desenvolvedor = {
  async iniciar() {
    document.querySelectorAll('#nav-dev button').forEach((btn) => {
      btn.addEventListener('click', () => this.trocarAba(btn.dataset.aba));
    });
    await this.carregarConfig();
    await this.trocarAba('visual');
  },

  async trocarAba(aba) {
    document.querySelectorAll('#nav-dev button').forEach((b) => b.classList.toggle('ativo', b.dataset.aba === aba));
    document.querySelectorAll('.dev-aba').forEach((el) => el.classList.add('oculto'));
    Utils.mostrar('dev-aba-' + aba);
  },

  async carregarConfig() {
    const resp = await Api.chamar('config.completa', {});
    if (!resp.sucesso) return Utils.toast(resp.erro, 'erro');
    const c = resp.dados;
    document.getElementById('dev-nome-sistema').value = c.NOME_SISTEMA;
    document.getElementById('dev-cor-primaria').value = c.COR_PRIMARIA;
    document.getElementById('dev-cor-secundaria').value = c.COR_SECUNDARIA;
    document.getElementById('dev-tema-admin').value = c.TEMA_ADMIN;
    document.getElementById('dev-tema-func').value = c.TEMA_FUNCIONARIO;
    document.getElementById('dev-logo-preview').src = c.LOGO_URL || 'icons/icon-192.png';

    document.getElementById('dev-sheet-id').value = c.SHEET_ID;
    document.getElementById('dev-pasta-fotos').value = c.PASTA_FOTOS_ID;
    document.getElementById('dev-pasta-atestados').value = c.PASTA_ATESTADOS_ID;

    document.getElementById('dev-tolerancia-atraso').value = c.TOLERANCIA_ATRASO_MIN;
    document.getElementById('dev-tolerancia-saida').value = c.TOLERANCIA_SAIDA_ANTECIPADA_MIN;
    document.getElementById('dev-regra-hora-extra').value = c.REGRA_HORA_EXTRA;
    document.getElementById('dev-percentual-extra').value = c.PERCENTUAL_HORA_EXTRA;
    document.getElementById('dev-banco-horas').checked = c.BANCO_HORAS_ATIVO === 'true';

    document.getElementById('dev-ponto-offline').checked = c.PERMITE_PONTO_OFFLINE === 'true';
    document.getElementById('dev-foto-obrigatoria').checked = c.FOTO_OBRIGATORIA === 'true';
    document.getElementById('dev-geo-obrigatoria').checked = c.GEOLOCALIZACAO_OBRIGATORIA === 'true';
    document.getElementById('dev-distancia-maxima').value = c.DISTANCIA_MAXIMA_METROS;
    document.getElementById('dev-permite-justificativa').checked = c.PERMITE_JUSTIFICATIVA === 'true';
    document.getElementById('dev-admin-aprova-justificativa').checked = c.ADMIN_APROVA_JUSTIFICATIVA === 'true';
    document.getElementById('dev-fora-raio-acao').value = c.FORA_DO_RAIO_ACAO;

    document.getElementById('dev-mensagem-boas-vindas').value = c.MENSAGEM_BOAS_VINDAS;
    document.getElementById('dev-lembretes-ativos').checked = c.LEMBRETES_ATIVOS === 'true';
  },

  async salvarVisual(ev) {
    ev.preventDefault();
    const corpo = {
      NOME_SISTEMA: document.getElementById('dev-nome-sistema').value,
      COR_PRIMARIA: document.getElementById('dev-cor-primaria').value,
      COR_SECUNDARIA: document.getElementById('dev-cor-secundaria').value,
      TEMA_ADMIN: document.getElementById('dev-tema-admin').value,
      TEMA_FUNCIONARIO: document.getElementById('dev-tema-func').value
    };
    const resp = await Api.chamar('config.salvar', corpo);
    if (!resp.sucesso) return Utils.toast(resp.erro, 'erro');
    Utils.toast('Identidade visual atualizada!', 'sucesso');
    Utils.aplicarTema({ nomeSistema: corpo.NOME_SISTEMA, corPrimaria: corpo.COR_PRIMARIA, corSecundaria: corpo.COR_SECUNDARIA });
  },

  async enviarLogo(ev) {
    const arquivo = ev.target.files[0];
    if (!arquivo) return;
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(arquivo);
    });
    const resp = await Api.chamar('config.uploadLogo', { imagemBase64: base64 });
    if (!resp.sucesso) return Utils.toast(resp.erro, 'erro');
    document.getElementById('dev-logo-preview').src = resp.dados.logoUrl;
    Utils.toast('Logo enviada com sucesso!', 'sucesso');
  },

  async salvarIntegracoes(ev) {
    ev.preventDefault();
    const corpo = {
      SHEET_ID: document.getElementById('dev-sheet-id').value,
      PASTA_FOTOS_ID: document.getElementById('dev-pasta-fotos').value,
      PASTA_ATESTADOS_ID: document.getElementById('dev-pasta-atestados').value
    };
    const resp = await Api.chamar('config.salvar', corpo);
    if (!resp.sucesso) return Utils.toast(resp.erro, 'erro');
    Utils.toast('Integrações salvas!', 'sucesso');
  },

  async salvarRegras(ev) {
    ev.preventDefault();
    const corpo = {
      TOLERANCIA_ATRASO_MIN: document.getElementById('dev-tolerancia-atraso').value,
      TOLERANCIA_SAIDA_ANTECIPADA_MIN: document.getElementById('dev-tolerancia-saida').value,
      REGRA_HORA_EXTRA: document.getElementById('dev-regra-hora-extra').value,
      PERCENTUAL_HORA_EXTRA: document.getElementById('dev-percentual-extra').value,
      BANCO_HORAS_ATIVO: document.getElementById('dev-banco-horas').checked ? 'true' : 'false',
      PERMITE_PONTO_OFFLINE: document.getElementById('dev-ponto-offline').checked ? 'true' : 'false',
      FOTO_OBRIGATORIA: document.getElementById('dev-foto-obrigatoria').checked ? 'true' : 'false',
      GEOLOCALIZACAO_OBRIGATORIA: document.getElementById('dev-geo-obrigatoria').checked ? 'true' : 'false',
      DISTANCIA_MAXIMA_METROS: document.getElementById('dev-distancia-maxima').value,
      PERMITE_JUSTIFICATIVA: document.getElementById('dev-permite-justificativa').checked ? 'true' : 'false',
      ADMIN_APROVA_JUSTIFICATIVA: document.getElementById('dev-admin-aprova-justificativa').checked ? 'true' : 'false',
      FORA_DO_RAIO_ACAO: document.getElementById('dev-fora-raio-acao').value
    };
    const resp = await Api.chamar('config.salvar', corpo);
    if (!resp.sucesso) return Utils.toast(resp.erro, 'erro');
    Utils.toast('Regras salvas!', 'sucesso');
  },

  async salvarMensagens(ev) {
    ev.preventDefault();
    const corpo = {
      MENSAGEM_BOAS_VINDAS: document.getElementById('dev-mensagem-boas-vindas').value,
      LEMBRETES_ATIVOS: document.getElementById('dev-lembretes-ativos').checked ? 'true' : 'false'
    };
    const resp = await Api.chamar('config.salvar', corpo);
    if (!resp.sucesso) return Utils.toast(resp.erro, 'erro');
    Utils.toast('Mensagens salvas!', 'sucesso');
  }
};

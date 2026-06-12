/**
 * form.js
 * Formulário de palpite do Bolão Super Copo da Copa.
 *
 * Responsabilidades:
 *  - Máscaras de CPF e telefone em tempo real.
 *  - Validação client-side (nome, telefone, CPF com dígitos verificadores).
 *  - Envio via fetch para /api/palpite e exibição do modal de sucesso.
 */
(function () {
  'use strict';

  /* ----------------------------------------------------------------
   * Utilidades de máscara
   * ---------------------------------------------------------------- */

  /**
   * Remove tudo que não for dígito.
   */
  function somenteDigitos(valor) {
    return (valor || '').replace(/\D/g, '');
  }

  /**
   * Formata CPF como 000.000.000-00 (máx. 11 dígitos).
   */
  function formatarCpf(valor) {
    var d = somenteDigitos(valor).slice(0, 11);
    var out = d;
    if (d.length > 9) {
      out = d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9);
    } else if (d.length > 6) {
      out = d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6);
    } else if (d.length > 3) {
      out = d.slice(0, 3) + '.' + d.slice(3);
    }
    return out;
  }

  /**
   * Formata telefone como (00) 00000-0000 (11 díg.) ou (00) 0000-0000 (10 díg.).
   */
  function formatarTelefone(valor) {
    var d = somenteDigitos(valor).slice(0, 11);
    if (d.length === 0) {
      return '';
    }
    if (d.length <= 2) {
      return '(' + d;
    }
    if (d.length <= 6) {
      return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    }
    if (d.length <= 10) {
      // Telefone fixo: (00) 0000-0000
      return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    }
    // Celular: (00) 00000-0000
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }

  /* ----------------------------------------------------------------
   * Helpers de erro
   * ---------------------------------------------------------------- */

  function definirErro(spanId, mensagem) {
    var span = document.getElementById(spanId);
    if (span) {
      span.textContent = mensagem || '';
    }
  }

  function limparErros() {
    definirErro('erro-nome', '');
    definirErro('erro-telefone', '');
    definirErro('erro-cpf', '');
    var geral = document.getElementById('erro-geral');
    if (geral) {
      geral.textContent = '';
    }
  }

  /**
   * Mostra uma mensagem de erro geral (#erro-geral) ou, na falta, um alert.
   */
  function mostrarErroGeral(mensagem) {
    var geral = document.getElementById('erro-geral');
    if (geral) {
      geral.textContent = mensagem;
    } else {
      alert(mensagem);
    }
  }

  /* ----------------------------------------------------------------
   * Inicialização
   * ---------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('form-palpite');
    if (!form) {
      // Página sem formulário de palpite.
      return;
    }

    var inputCpf = form.querySelector('[name="cpf"]');
    var inputTelefone = form.querySelector('[name="telefone"]');
    var inputNome = form.querySelector('[name="nome"]');

    /* ---- Máscaras em tempo real ---- */

    if (inputCpf) {
      inputCpf.addEventListener('input', function () {
        inputCpf.value = formatarCpf(inputCpf.value);
        if (somenteDigitos(inputCpf.value).length === 11) {
          definirErro('erro-cpf', '');
        }
      });
    }

    if (inputTelefone) {
      inputTelefone.addEventListener('input', function () {
        inputTelefone.value = formatarTelefone(inputTelefone.value);
        var d = somenteDigitos(inputTelefone.value);
        if (d.length === 10 || d.length === 11) {
          definirErro('erro-telefone', '');
        }
      });
    }

    if (inputNome) {
      inputNome.addEventListener('input', function () {
        if (inputNome.value.trim().length >= 3) {
          definirErro('erro-nome', '');
        }
      });
    }

    /* ---- Validação completa do formulário ---- */

    function validar() {
      limparErros();
      var ok = true;

      // Nome: mínimo 3 caracteres.
      var nome = inputNome ? inputNome.value.trim() : '';
      if (nome.length < 3) {
        definirErro('erro-nome', 'Informe seu nome.');
        ok = false;
      }

      // Telefone: 10 ou 11 dígitos.
      var telDigitos = inputTelefone ? somenteDigitos(inputTelefone.value) : '';
      if (telDigitos.length !== 10 && telDigitos.length !== 11) {
        definirErro('erro-telefone', 'Informe seu telefone.');
        ok = false;
      }

      // CPF: precisa ter 11 dígitos (a autorização real é feita no servidor,
      // contra a lista de colaboradores).
      var cpfDigitos = inputCpf ? somenteDigitos(inputCpf.value) : '';
      if (cpfDigitos.length !== 11) {
        definirErro('erro-cpf', 'Informe um CPF com 11 dígitos.');
        ok = false;
      }

      // Placar: obrigatório (ambos os campos preenchidos).
      var golsAEl = form.querySelector('[name="gols_time_a"]');
      var golsBEl = form.querySelector('[name="gols_time_b"]');
      var golsAVazio = !golsAEl || golsAEl.value.trim() === '';
      var golsBVazio = !golsBEl || golsBEl.value.trim() === '';
      if (golsAVazio || golsBVazio) {
        mostrarErroGeral('Informe o placar.');
        ok = false;
      }

      return ok;
    }

    /* ---- Envio ---- */

    form.addEventListener('submit', function (evento) {
      evento.preventDefault();

      if (!validar()) {
        return;
      }

      // Monta o payload a partir dos campos do formulário.
      var jogoIdEl = form.querySelector('[name="jogo_id"]');
      var golsAEl = form.querySelector('[name="gols_time_a"]');
      var golsBEl = form.querySelector('[name="gols_time_b"]');

      var payload = {
        nome: inputNome ? inputNome.value.trim() : '',
        telefone: inputTelefone ? somenteDigitos(inputTelefone.value) : '',
        cpf: inputCpf ? somenteDigitos(inputCpf.value) : '',
        jogo_id: jogoIdEl ? jogoIdEl.value : '',
        gols_time_a: golsAEl ? Number(golsAEl.value) : 0,
        gols_time_b: golsBEl ? Number(golsBEl.value) : 0
      };

      // Desabilita o botão durante o envio.
      var btn = form.querySelector('[type="submit"]');
      var textoOriginal = '';
      if (btn) {
        textoOriginal = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Enviando...';
      }

      function reabilitarBotao() {
        if (btn) {
          btn.disabled = false;
          btn.textContent = textoOriginal;
        }
      }

      fetch('/api/palpite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (resp) {
          // Lê o corpo como JSON em qualquer caso (sucesso ou erro).
          return resp.json().then(function (dados) {
            return { ok: resp.ok, dados: dados };
          });
        })
        .then(function (resultado) {
          if (resultado.ok && resultado.dados && resultado.dados.sucesso) {
            // Sucesso: confirma o palpite no modal.
            fecharModalPalpite();
            abrirModalSucesso();
            form.reset();
          } else {
            // Erro retornado pela API.
            var msg =
              (resultado.dados && resultado.dados.erro) ||
              'Não foi possível enviar seu palpite. Tente novamente.';
            mostrarErroGeral(msg);
          }
        })
        .catch(function () {
          mostrarErroGeral('Erro de conexão. Verifique sua internet e tente novamente.');
        })
        .then(function () {
          // finally: reabilita o botão sempre.
          reabilitarBotao();
        });
    });
  });

  /* ----------------------------------------------------------------
   * Modais (palpite e sucesso) + botão "Voltar"
   *
   * Ao abrir um modal, empilhamos um estado no histórico. O botão voltar do
   * navegador/celular dispara `popstate`, que apenas FECHA o modal — sem sair
   * da página. Fechar pelo botão/clique fora também sincroniza o histórico
   * (consumindo a entrada que adicionamos).
   * ---------------------------------------------------------------- */

  var IDS_MODAIS = ['modal-palpite', 'modal-sucesso'];
  var entradaHistorico = false; // há uma entrada nossa no histórico?
  var ignorarPopstate = false;  // evita fechar duas vezes ao sincronizar

  function modaisAbertos() {
    return IDS_MODAIS.filter(function (id) {
      var m = document.getElementById(id);
      return m && !m.hasAttribute('hidden');
    });
  }

  function ocultarModal(id) {
    var m = document.getElementById(id);
    if (m) m.setAttribute('hidden', '');
  }

  function mostrarModal(id) {
    var m = document.getElementById(id);
    if (!m) return;
    m.removeAttribute('hidden');
    // Garante UMA entrada de histórico enquanto algum modal estiver aberto.
    if (!entradaHistorico) {
      entradaHistorico = true;
      try { history.pushState({ scModal: true }, ''); } catch (e) { /* ignore */ }
    }
  }

  // Fechamento por ação do usuário: oculta e desfaz a entrada do histórico.
  function fecharModaisUsuario() {
    modaisAbertos().forEach(ocultarModal);
    if (entradaHistorico) {
      entradaHistorico = false;
      ignorarPopstate = true;
      try { history.back(); } catch (e) { ignorarPopstate = false; }
    }
  }

  // Botão "Voltar": fecha o modal aberto em vez de navegar para fora.
  window.addEventListener('popstate', function () {
    if (ignorarPopstate) { ignorarPopstate = false; return; }
    var abertos = modaisAbertos();
    if (abertos.length) {
      entradaHistorico = false; // a entrada foi consumida pelo "voltar"
      abertos.forEach(ocultarModal);
    }
  });

  /* ---- Modal de sucesso ---- */
  function abrirModalSucesso() { mostrarModal('modal-sucesso'); }
  function fecharModalSucesso() { fecharModaisUsuario(); }

  /* ---- Modal do formulário de palpite ---- */
  function abrirModalPalpite() { mostrarModal('modal-palpite'); }
  // Fechamento "interno" (ao abrir o sucesso): só oculta, sem mexer no histórico.
  function fecharModalPalpite() { ocultarModal('modal-palpite'); }
  window.abrirModalPalpite = abrirModalPalpite;
  window.fecharModalPalpite = fecharModalPalpite;

  document.addEventListener('DOMContentLoaded', function () {
    var botaoAbrir = document.getElementById('abrir-palpite');
    if (botaoAbrir) {
      botaoAbrir.addEventListener('click', abrirModalPalpite);
    }

    var botaoHeader = document.getElementById('header-participar');
    if (botaoHeader) {
      botaoHeader.addEventListener('click', abrirModalPalpite);
    }

    // Header fixo: mostra fundo e o botão "Participar" ao rolar a tela.
    var siteHeader = document.getElementById('site-header');
    var headerLinks = document.getElementById('header-links');
    if (siteHeader) {
      var aoRolar = function () {
        var rolou = window.scrollY > 200;
        siteHeader.classList.toggle('is-scrolled', rolou);
        // Ao rolar: esconde Como Funciona/Ranking e mostra Participar.
        if (headerLinks) headerLinks.style.display = rolou ? 'none' : 'flex';
        if (botaoHeader) botaoHeader.style.display = rolou ? 'inline-flex' : 'none';
      };
      window.addEventListener('scroll', aoRolar, { passive: true });
      aoRolar();
    }

    var modalPalpite = document.getElementById('modal-palpite');
    if (modalPalpite) {
      modalPalpite.addEventListener('click', function (evento) {
        var card = modalPalpite.querySelector('.palpite-box');
        if (
          evento.target.hasAttribute('data-fechar-palpite') ||
          (card && !card.contains(evento.target))
        ) {
          fecharModaisUsuario();
        }
      });
    }
  });

  // O modal de sucesso fecha SOMENTE pelo botão Fechar (não fecha ao clicar fora).
  document.addEventListener('DOMContentLoaded', function () {
    var modal = document.getElementById('modal-sucesso');
    if (!modal) {
      return;
    }
    var botoesFechar = modal.querySelectorAll('[data-fechar-modal]');
    for (var i = 0; i < botoesFechar.length; i++) {
      botoesFechar[i].addEventListener('click', function (evento) {
        evento.preventDefault();
        fecharModaisUsuario();
      });
    }
  });

  // Expõe a função de fechar globalmente (para uso em onclick, se houver).
  window.fecharModalSucesso = fecharModalSucesso;
})();

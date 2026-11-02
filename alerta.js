// Alerta de praião: notificação no celular, enviada pelo OneSignal.
// O robô do GitHub (.github/workflows/praiao.yml) decide quando mandar; aqui só ativamos e desativamos.
(function () {
  const APP_ID = window.ONESIGNAL_APP_ID || "";
  const $ = (s) => document.querySelector(s);
  const ler = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const banner = $("#alerta"), rodape = $("#alertaRodape");
  if (!APP_ID || APP_ID.indexOf("COLE") === 0 || !banner) return;   // sem OneSignal configurado, nada aparece

  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const instalado = window.navigator.standalone || matchMedia("(display-mode: standalone)").matches;
  let OS = null;

  function mostrar() {
    const ligado = !!(OS && OS.User.PushSubscription.optedIn);
    if (ligado && !ler("pm-contou-alerta")) { gravar("pm-contou-alerta", true); (window.pmEventos = window.pmEventos || []).push("ativou-alerta"); }
    banner.hidden = ligado || !!ler("pm-alerta-fechado");
    rodape.hidden = false;
    rodape.innerHTML = ligado
      ? '🔔 Alerta de praião ligado · <button id="alertaDesligar">desligar</button>'
      : '🔔 <button id="alertaLigarRodape">Ativar alerta de praião</button>';
    const d = $("#alertaDesligar"), l = $("#alertaLigarRodape");
    if (d) d.onclick = async () => { await OS.User.PushSubscription.optOut(); mostrar(); };
    if (l) l.onclick = () => { gravar("pm-alerta-fechado", false); banner.hidden = false; banner.scrollIntoView({ behavior: "smooth", block: "center" }); ativar(); };
  }

  async function ativar() {
    const msg = $("#alertaMsg");
    if (ios && !instalado) {
      msg.innerHTML = "No iPhone, primeiro instale o app: toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>. Abra pelo ícone novo e ative aqui.";
      return;
    }
    if (!OS) { msg.textContent = "Carregando… tenta de novo em alguns segundos."; return; }
    if (!OS.Notifications.isPushSupported()) { msg.textContent = "Esse navegador não aceita notificações. Tenta pelo Chrome ou instalando o app."; return; }
    try {
      await OS.User.PushSubscription.optIn();
      if (OS.User.PushSubscription.optedIn) msg.textContent = "Pronto! Você vai receber o aviso quando vier praião. ☀️";
      else if (window.Notification && Notification.permission === "denied") msg.textContent = "As notificações estão bloqueadas. Libere nas configurações do celular para o Praiômetro.";
    } catch (e) { msg.textContent = "Não deu certo agora. Tenta de novo daqui a pouco."; }
    setTimeout(mostrar, 2500);
  }

  $("#ativarAlerta").onclick = ativar;
  $("#fecharAlerta").onclick = () => { banner.hidden = true; gravar("pm-alerta-fechado", true); };
  mostrar();

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  // pasta onde o site está (funciona tanto em praiometrorio.com.br/ quanto no endereço antigo do GitHub)
  const BASE = new URL(".", location.href).pathname;
  window.OneSignalDeferred.push(async function (OneSignal) {
    await OneSignal.init({
      appId: APP_ID,
      // trabalhador próprio numa pasta separada, para não misturar com o sw.js do site
      serviceWorkerPath: BASE.slice(1) + "push/onesignal/OneSignalSDKWorker.js",
      serviceWorkerParam: { scope: BASE + "push/onesignal/" }
    });
    OS = OneSignal;
    OneSignal.User.PushSubscription.addEventListener("change", mostrar);
    mostrar();
  });

  // usado pelo Treino cedo: liga a notificação e guarda os treinos como etiquetas no OneSignal (tr_esporte_praia_hora = dias)
  window.pmPush = {
    async ligar() {
      if (ios && !instalado) return "instalar";
      if (!OS) return "carregando";
      if (!OS.Notifications.isPushSupported()) return "nao-suporta";
      try { await OS.User.PushSubscription.optIn(); } catch (e) { return "erro"; }
      if (OS.User.PushSubscription.optedIn) { mostrar(); return "ok"; }
      return window.Notification && Notification.permission === "denied" ? "bloqueado" : "erro";
    },
    async etiquetas(novas) {
      if (!OS) return false;
      try {
        novas = novas || {};
        let atuais = {};
        try { atuais = (OS.User.getTags && OS.User.getTags()) || {}; } catch (e) {}
        // tira as etiquetas de treino que não valem mais (e as do formato antigo t0..t7)
        const tirar = Object.keys(atuais).filter((k) => (/^tr_/.test(k) || /^t\d$/.test(k)) && !(k in novas))
          .concat(["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7"].filter((k) => !(k in atuais)));
        if (tirar.length) await OS.User.removeTags(tirar);
        if (Object.keys(novas).length) await OS.User.addTags(novas);
        return true;
      } catch (e) { return false; }
    }
  };
})();

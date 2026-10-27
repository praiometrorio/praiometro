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
  window.OneSignalDeferred.push(async function (OneSignal) {
    await OneSignal.init({
      appId: APP_ID,
      // trabalhador próprio numa pasta separada, para não misturar com o sw.js do site
      serviceWorkerPath: "praiometro/push/onesignal/OneSignalSDKWorker.js",
      serviceWorkerParam: { scope: "/praiometro/push/onesignal/" }
    });
    OS = OneSignal;
    OneSignal.User.PushSubscription.addEventListener("change", mostrar);
    mostrar();
  });
})();

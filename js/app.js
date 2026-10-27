// Praiômetro Rio — lógica do site
(function () {
  "use strict";

  const PRAIAS = window.PRAIAS;
  const REGIOES = window.REGIOES;
  const FUSO = "America/Sao_Paulo";
  const HORA_INI = 6, HORA_FIM = 19;          // janela de praia considerada
  const CACHE_CHAVE = "pm-previsao-v1";
  const CACHE_MIN = 60;                        // minutos que a previsão fica guardada

  // ---------- utilidades ----------
  const $ = (s) => document.querySelector(s);
  const f1 = (n) => n.toFixed(1).replace(".", ",");
  const fmt = (n) => String(Math.round(n * 10) / 10).replace(".", ",");
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const media = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const guarda = {
    ler(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } },
    gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const SEMANA_LONGA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  // ---------- ícones ----------
  const IC = {
    sol: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="var(--sun)"/><g stroke="var(--sun)" stroke-width="2" stroke-linecap="round"><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></g></svg>',
    parcial: '<svg viewBox="0 0 24 24"><circle cx="9" cy="9" r="4.5" fill="var(--sun)"/><path d="M8 19h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.4 1.6A3.3 3.3 0 0 0 8 19z" fill="var(--muted)" opacity=".75"/></svg>',
    nuvem: '<svg viewBox="0 0 24 24"><path d="M7 19h11a4.5 4.5 0 0 0 .3-9A6 6 0 0 0 6.6 11.6 3.8 3.8 0 0 0 7 19z" fill="var(--muted)"/></svg>',
    chuva: '<svg viewBox="0 0 24 24"><path d="M7 15h11a4.5 4.5 0 0 0 .3-9A6 6 0 0 0 6.6 7.6 3.8 3.8 0 0 0 7 15z" fill="var(--muted)"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/></svg>',
    temp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z"/></svg>',
    gota: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>',
    uv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>',
    vento: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/></svg>',
    onda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 12c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3M2 18c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3"/></svg>',
    agua: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13.5V5a2 2 0 0 1 4 0v8.5a4 4 0 1 1-4 0zM2 21c2 0 2-1.5 4-1.5S8 21 10 21M14 21c2 0 2-1.5 4-1.5s2 1.5 4 1.5"/></svg>',
    escudo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/></svg>',
    porDoSol: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 18a5 5 0 0 0-10 0M2 18h20M12 3v5M4.2 10.2l1.4 1.4M19.8 10.2l-1.4 1.4M8 6l4 2 4-2"/></svg>'
  };
  const iconeTempo = (chuva, nuvens) => chuva >= 50 ? IC.chuva : nuvens >= 65 ? IC.nuvem : nuvens >= 30 ? IC.parcial : IC.sol;

  // ---------- notas ----------
  function nota(x, modo, praia) {
    let s;
    const ondas = x.ondas == null ? (praia.baia ? 0.3 : 1.0) : x.ondas;
    if (modo === "surfe") {
      if (praia.baia) return 1;
      s = 10 - Math.abs(ondas - 1.6) * 3.2 - Math.max(0, x.vento - 12) * 0.15 - x.chuva * 0.02 - Math.max(0, 24 - x.temp) * 0.1;
    } else {
      s = 10 - x.chuva * 0.045 - Math.max(0, x.nuvens - 30) * 0.025 - Math.max(0, x.vento - 15) * 0.12
        - Math.max(0, ondas - 1.2) * 2.2 - (x.propria === false ? 2.5 : 0) - Math.max(0, 26 - x.temp) * 0.35;
    }
    return Math.round(clamp(s, 0, 10) * 10) / 10;
  }
  const notaHora = (t, r, c) => clamp(10 - r * 0.08 - Math.max(0, c - 30) * 0.035 - Math.max(0, 25 - t) * 0.3, 0, 10);
  const cor = (s) => s == null ? "--s0" : s < 3 ? "--s1" : s < 5 ? "--s2" : s < 6.5 ? "--s3" : s < 8 ? "--s4" : "--s5";
  const veredito = (s, m) => m === "surfe"
    ? (s >= 8 ? "Mar perfeito para surfar" : s >= 6.5 ? "Boas ondas" : s >= 5 ? "Dá para pegar umas" : s >= 3 ? "Mar fraco ou bagunçado" : "Sem condições")
    : (s >= 8 ? "Praião!" : s >= 6.5 ? "Bom dia de praia" : s >= 5 ? "Dá pro gasto" : s >= 3 ? "Só se for rápido" : "Melhor evitar");
  const uvCat = (u) => u >= 11 ? "Extremo" : u >= 8 ? "Muito alto" : u >= 6 ? "Alto" : u >= 3 ? "Moderado" : "Baixo";
  const porDoSolTxt = (c) => c >= 20 && c <= 60 ? "Boa chance de céu colorido" : c < 20 ? "Céu limpo, cores suaves" : "Nuvens devem esconder";

  // ---------- estado ----------
  const salvo = guarda.ler("pm-preferencias") || {};
  const estado = {
    dia: 0,
    modo: salvo.modo === "surfe" ? "surfe" : "familia",
    sel: PRAIAS.some((p) => p.id === salvo.sel) ? salvo.sel : "ipanema",
    regiao: matchMedia("(max-width:640px)").matches ? "zs" : "todas"
  };
  const salvar = () => guarda.gravar("pm-preferencias", { modo: estado.modo, sel: estado.sel });

  let previsao = null;     // previsao[idPraia][indiceDia] = {...}
  let datas = [];          // datas da previsão (AAAA-MM-DD)
  let linhas = [];         // praias do dia selecionado com nota
  let balneab = { praias: {} };

  // ---------- busca da previsão ----------
  function urlPrevisao() {
    const lat = PRAIAS.map((p) => p.lat).join(","), lon = PRAIAS.map((p) => p.lon).join(",");
    return "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
      "&hourly=temperature_2m,precipitation_probability,cloud_cover,wind_speed_10m" +
      "&daily=sunrise,sunset,uv_index_max&timezone=" + encodeURIComponent(FUSO) + "&forecast_days=7";
  }
  function urlMar() {
    const lat = PRAIAS.map((p) => p.lat).join(","), lon = PRAIAS.map((p) => p.lon).join(",");
    return "https://marine-api.open-meteo.com/v1/marine?latitude=" + lat + "&longitude=" + lon +
      "&hourly=wave_height,sea_surface_temperature&timezone=" + encodeURIComponent(FUSO) + "&forecast_days=7";
  }
  async function buscarJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }
  async function carregar() {
    const cache = guarda.ler(CACHE_CHAVE);
    if (cache && Date.now() - cache.t < CACHE_MIN * 60000) return cache;
    const [tempo, mar] = await Promise.all([
      buscarJSON(urlPrevisao()),
      buscarJSON(urlMar()).catch(() => null)   // se o mar falhar, o site funciona sem ondas
    ]);
    const novo = { t: Date.now(), tempo, mar };
    guarda.gravar(CACHE_CHAVE, novo);
    return novo;
  }
  function montar({ tempo, mar }) {
    const T = Array.isArray(tempo) ? tempo : [tempo];
    const M = mar ? (Array.isArray(mar) ? mar : [mar]) : [];
    datas = T[0].daily.time;
    const out = {};
    PRAIAS.forEach((p, i) => {
      const t = T[i], m = M[i];
      const h = t.hourly;
      out[p.id] = datas.map((data, d) => {
        const idx = [];
        h.time.forEach((ts, k) => {
          if (ts.slice(0, 10) !== data) return;
          const hr = +ts.slice(11, 13);
          if (hr >= HORA_INI && hr <= HORA_FIM) idx.push(k);
        });
        const val = (arr) => idx.map((k) => arr[k]).filter((v) => v != null);
        const temps = val(h.temperature_2m), chuvas = val(h.precipitation_probability),
              nuvens = val(h.cloud_cover), ventos = val(h.wind_speed_10m);
        let ondas = null, aguaT = null;
        if (m && m.hourly) {
          const mi = m.hourly.time.reduce((acc, ts, k) => {
            const hr = +ts.slice(11, 13);
            if (ts.slice(0, 10) === data && hr >= HORA_INI && hr <= HORA_FIM) acc.push(k);
            return acc;
          }, []);
          const w = mi.map((k) => m.hourly.wave_height[k]).filter((v) => v != null);
          const s = mi.map((k) => m.hourly.sea_surface_temperature[k]).filter((v) => v != null);
          if (w.length) ondas = Math.max(...w);
          if (s.length) aguaT = media(s);
        }
        if (p.baia && ondas != null) ondas = Math.min(ondas, 0.5); // dentro da baía o mar é bem mais calmo
        const prop = balneab.praias[p.id];
        return {
          temp: temps.length ? Math.round(Math.max(...temps)) : 0,
          chuva: chuvas.length ? Math.max(...chuvas) : 0,
          nuvens: nuvens.length ? Math.round(media(nuvens)) : 0,
          vento: ventos.length ? Math.round(Math.max(...ventos)) : 0,
          uv: Math.round(t.daily.uv_index_max[d] || 0),
          ondas: ondas == null ? null : Math.round(ondas * 10) / 10,
          agua: aguaT == null ? null : Math.round(aguaT * 10) / 10,
          nascer: (t.daily.sunrise[d] || "").slice(11, 16),
          porDoSol: (t.daily.sunset[d] || "").slice(11, 16),
          propria: prop === true ? true : prop === false ? false : null,
          horas: idx.map((k) => [Math.round(h.temperature_2m[k]), h.precipitation_probability[k] || 0, h.cloud_cover[k] || 0, +h.time[k].slice(11, 13)])
        };
      });
    });
    previsao = out;
  }

  // ---------- dias ----------
  function ehPraiao(d) {
    const notas = PRAIAS.filter((p) => !p.baia).map((p) => nota(previsao[p.id][d], "familia", p));
    return notas.filter((n) => n >= 8).length >= 4;
  }
  function desenharDias() {
    const ref = previsao.ipanema;
    $("#dias").innerHTML = datas.map((data, d) => {
      const dt = new Date(data + "T12:00:00");
      const nome = d === 0 ? "Hoje" : d === 1 ? "Amanhã" : SEMANA[dt.getDay()];
      const x = ref[d];
      return `<button class="dia" data-d="${d}" aria-pressed="${d === estado.dia}">
        <span class="dn">${nome}</span><span class="dd">${data.slice(8, 10)}/${data.slice(5, 7)}</span>
        ${iconeTempo(x.chuva, x.nuvens)}<span class="dt">${x.temp}°</span>
        <span class="pr${ehPraiao(d) ? "" : " vazio"}">Praião</span></button>`;
    }).join("");
    document.querySelectorAll(".dia").forEach((b) => b.onclick = () => { estado.dia = +b.dataset.d; desenhar(); });
  }
  const nomeDia = (d) => {
    if (d === 0) return "hoje";
    if (d === 1) return "amanhã";
    return SEMANA_LONGA[new Date(datas[d] + "T12:00:00").getDay()];
  };

  // ---------- mapa ----------
  let mapa, pinos = {};
  function iniciarMapa() {
    const r = REGIOES[estado.regiao].caixa;
    mapa = new maplibregl.Map({
      container: "mapa",
      style: "https://tiles.openfreemap.org/styles/liberty",
      bounds: [[r[0], r[1]], [r[2], r[3]]],
      fitBoundsOptions: { padding: 30 },
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false
    });
    mapa.touchZoomRotate.disableRotation();
    mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapa.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), "top-right");
    const nomes = () => $("#mapa").classList.toggle("mostrar-nomes", mapa.getZoom() >= 12.4);
    mapa.on("zoom", nomes);
    mapa.on("load", nomes);

    PRAIAS.forEach((p) => {
      const el = document.createElement("div");
      el.className = "pin";
      el.innerHTML = '<span class="nota">–</span><span class="rot"></span>';
      el.querySelector(".rot").textContent = p.nome;
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-label", p.nome);
      el.addEventListener("click", (e) => { e.stopPropagation(); selecionar(p.id, false); });
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selecionar(p.id, false); } });
      const mk = new maplibregl.Marker({ element: el, anchor: "left", offset: [-18, 0] }).setLngLat([p.lon, p.lat]).addTo(mapa);
      pinos[p.id] = { el, mk };
    });
  }
  function irParaRegiao(r) {
    estado.regiao = r;
    document.querySelectorAll("#regioes button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.r === r));
    const c = REGIOES[r].caixa;
    mapa.fitBounds([[c[0], c[1]], [c[2], c[3]]], { padding: 30, duration: 900 });
    desenharRanking();
  }
  function selecionar(id, voar) {
    estado.sel = id;
    salvar();
    const p = PRAIAS.find((x) => x.id === id);
    if (voar) mapa.flyTo({ center: [p.lon, p.lat], zoom: Math.max(mapa.getZoom(), 13.2), duration: 900 });
    desenhar();
  }

  // ---------- desenho ----------
  function desenhar() {
    document.querySelectorAll(".dia").forEach((b) => b.setAttribute("aria-pressed", +b.dataset.d === estado.dia));
    document.querySelectorAll("#modo button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.modo === estado.modo));
    linhas = PRAIAS.map((p) => { const x = previsao[p.id][estado.dia]; return { p, x, s: nota(x, estado.modo, p) }; });

    linhas.forEach(({ p, s }) => {
      const pin = pinos[p.id];
      const n = pin.el.querySelector(".nota");
      n.textContent = s >= 10 ? "10" : f1(s);
      n.style.background = `var(${cor(s)})`;
      pin.el.classList.toggle("on", p.id === estado.sel);
    });

    desenharResumo();
    desenharRanking();
    desenharDetalhe();
  }

  function desenharResumo() {
    const ord = linhas.slice().sort((a, b) => b.s - a.s), top = ord[0];
    const x = previsao.ipanema[estado.dia];
    const aguas = linhas.map((l) => l.x.agua).filter((v) => v != null);
    const boas = linhas.filter((l) => l.s >= 8).length;
    $("#resumo").innerHTML = `
      <div class="lead"><div class="dot" style="background:var(${cor(top.s)})">${f1(top.s)}</div>
        <div style="min-width:0"><span>${estado.modo === "surfe" ? "Melhor onda" : "Melhor praia"} ${nomeDia(estado.dia)}</span><em>${top.p.nome}</em>
        <p>${estado.modo === "surfe" ? "" : boas ? `${boas} praia${boas > 1 ? "s" : ""} com cara de praião` : "Nenhuma praia com nota 8 ou mais"}</p></div></div>
      <div><span>Sol</span><b>${x.nascer}–${x.porDoSol}</b><small>nascer e pôr</small></div>
      <div><span>UV máximo</span><b>${x.uv}</b><small>${uvCat(x.uv)}</small></div>
      <div><span>Mar</span><b>${aguas.length ? f1(media(aguas)) + "°C" : "–"}</b><small>média da água</small></div>`;
  }

  function desenharRanking() {
    if (!linhas.length) return;
    const ord = linhas.slice().sort((a, b) => b.s - a.s);
    const vis = estado.regiao === "todas" ? ord : ord.filter((l) => l.p.regiao === estado.regiao);
    $("#rankTitulo").textContent = estado.modo === "surfe" ? "Ranking do surfe" : "Ranking do dia";
    $("#rankSub").textContent = nomeDia(estado.dia).replace(/^./, (c) => c.toUpperCase()) + " · " + (estado.regiao === "todas" ? "todas as praias" : REGIOES[estado.regiao].nome);
    $("#rank").innerHTML = vis.map((l, i) => `<li><button data-id="${l.p.id}" aria-current="${l.p.id === estado.sel}">
      <span class="pos">${i + 1}</span>
      <span class="nm"><em>${l.p.nome}${l.x.propria === false ? "<small>imprópria</small>" : ""}</em><span class="barra"><i style="width:${l.s * 10}%;background:var(${cor(l.s)})"></i></span></span>
      <span class="val">${f1(l.s)}</span></button></li>`).join("");
    document.querySelectorAll("#rank button").forEach((b) => b.onclick = () => selecionar(b.dataset.id, true));
  }

  function desenharDetalhe() {
    const l = linhas.find((r) => r.p.id === estado.sel) || linhas[0], x = l.x, p = l.p;
    const C = 2 * Math.PI * 38;
    const hs = x.horas.map((h) => notaHora(h[0], h[1], h[2]));
    const mx = Math.max(...hs);
    const melhores = hs.map((s, i) => (s >= mx - 1.2 && s >= 5 ? i : -1)).filter((i) => i >= 0);
    let janela = "Nenhuma janela boa nesse dia";
    if (melhores.length) janela = `Melhor janela: <strong>das ${x.horas[melhores[0]][3]}h às ${x.horas[melhores[melhores.length - 1]][3] + 1}h</strong>`;
    const bal = x.propria === true ? '<span class="pill ok">Própria</span>' : x.propria === false ? '<span class="pill ruim">Imprópria</span>' : '<span class="pill semdado">Sem boletim</span>';
    $("#detalhe").innerHTML = `
      <div class="ptop">
        <div class="anel"><svg width="88" height="88" viewBox="0 0 88 88"><circle cx="44" cy="44" r="38" fill="none" stroke="var(--surface-2)" stroke-width="8"/><circle cx="44" cy="44" r="38" fill="none" stroke="var(${cor(l.s)})" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(C * l.s / 10).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 44 44)"/></svg><b>${f1(l.s)}</b></div>
        <div><h2>${p.nome}</h2><div class="veredito" style="color:var(${cor(l.s)})">${veredito(l.s, estado.modo)}</div><div class="local">${p.local}</div></div>
      </div>
      <div class="horas">
        <h3>Hora a hora</h3>
        <div class="hrow">${x.horas.map((h, i) => `<div class="h${melhores.includes(i) ? " melhor" : ""}" title="${h[3]}h: ${h[1]}% de chance de chuva">${iconeTempo(h[1], h[2])}<span class="t">${h[0]}°</span><i class="p" style="background:var(${cor(hs[i])})"></i><span>${h[3]}h</span></div>`).join("")}</div>
        <div class="janela">${janela}</div>
      </div>
      <div class="metricas">
        <div class="m"><span class="k">${IC.temp}Máxima</span><b>${x.temp}°C</b><small>entre ${HORA_INI}h e ${HORA_FIM}h</small></div>
        <div class="m"><span class="k">${IC.gota}Chuva</span><b>${x.chuva}%</b><small>maior chance no dia</small></div>
        <div class="m"><span class="k">${IC.uv}UV</span><b>${x.uv}</b><small>${uvCat(x.uv)}${x.uv >= 8 ? ", protetor a cada 2h" : ""}</small></div>
        <div class="m"><span class="k">${IC.vento}Vento</span><b>${x.vento} km/h</b><small>${x.vento > 22 ? "forte, areia voando" : x.vento > 14 ? "moderado" : "fraco"}</small></div>
        <div class="m"><span class="k">${IC.onda}Ondas</span><b>${x.ondas == null ? (p.baia ? "calmo" : "–") : fmt(x.ondas) + " m"}</b><small>${x.ondas == null ? (p.baia ? "dentro da baía" : "sem dado") : x.ondas < 0.6 ? "mar calmo" : x.ondas < 1.4 ? "mar médio" : "mar agitado"}</small></div>
        <div class="m"><span class="k">${IC.agua}Água</span><b>${x.agua == null ? "–" : fmt(x.agua) + "°C"}</b><small>${x.agua == null ? "sem dado" : x.agua < 21 ? "gelada" : x.agua < 23 ? "fresca" : "agradável"}</small></div>
        <div class="m"><span class="k">${IC.escudo}Água limpa?</span>${bal}<small>boletim do INEA</small></div>
        <div class="m"><span class="k">${IC.porDoSol}Pôr do sol</span><b>${x.porDoSol}</b><small>${porDoSolTxt(x.nuvens)}${p.porDoSol ? ". Vista clássica daqui" : ""}</small></div>
      </div>`;
  }

  // ---------- início ----------
  function controles() {
    $("#regioes").innerHTML = Object.entries(REGIOES).map(([k, v]) => `<button data-r="${k}" aria-pressed="${k === estado.regiao}">${v.nome}</button>`).join("");
    document.querySelectorAll("#regioes button").forEach((b) => b.onclick = () => irParaRegiao(b.dataset.r));
    document.querySelectorAll("#modo button").forEach((b) => b.onclick = () => { estado.modo = b.dataset.modo; salvar(); desenhar(); });

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const instalado = window.navigator.standalone || matchMedia("(display-mode: standalone)").matches;
    if (ios && !instalado && !guarda.ler("pm-instalar-fechado")) $("#instalar").hidden = false;
    $("#fecharInstalar").onclick = () => { $("#instalar").hidden = true; guarda.gravar("pm-instalar-fechado", true); };
  }

  async function iniciar() {
    controles();
    iniciarMapa();
    $("#detalhe").innerHTML = '<div class="carregando">Carregando a previsão das praias…</div>';
    try {
      balneab = await buscarJSON("data/balneabilidade.json").catch(() => ({ praias: {} }));
      const dados = await carregar();
      montar(dados);
      desenharDias();
      desenhar();
      const quando = new Date(dados.t);
      $("#atualizado").textContent = "Previsão atualizada às " + String(quando.getHours()).padStart(2, "0") + ":" + String(quando.getMinutes()).padStart(2, "0") + ".";
    } catch (e) {
      console.error(e);
      $("#detalhe").innerHTML = '<div class="aviso">Não consegui carregar a previsão agora. Verifique a internet e tente de novo.<br><button id="tentar">Tentar de novo</button></div>';
      $("#tentar").onclick = () => location.reload();
    }
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
  iniciar();
})();

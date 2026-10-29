// Praiômetro Rio — lógica do site (versão 2: cartões, selos, caminho do sol e sombra)
(function () {
  "use strict";

  const PRAIAS = window.PRAIAS;
  const REGIOES = window.REGIOES;
  const SOL = window.SOL;
  const FUSO = "America/Sao_Paulo";
  const OFFSET = "-03:00";                     // o Brasil não tem mais horário de verão
  const HORA_INI = 6, HORA_FIM = 20;           // janela de praia considerada (6h às 20h)
  const CACHE_CHAVE = "pm-previsao-v7";
  const CACHE_MIN = 10;                        // minutos que a previsão fica guardada (atualiza no máximo de 10 em 10)
  const RAIO_SOL = 1.3;                        // km: raio do arco do sol desenhado no mapa

  // ---------- utilidades ----------
  const $ = (s) => document.querySelector(s);
  const fmt = (n) => String(Math.round(n * 10) / 10).replace(".", ",");
  const media = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const pad = (n) => String(n).padStart(2, "0");
  const guarda = {
    ler(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } },
    gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const SEMANA_LONGA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const relogio = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hour12: false });
  const hm = (data) => relogio.format(data).replace(":", "h");
  const minutosDe = (txt) => (+txt.slice(0, 2)) * 60 + (+txt.slice(3, 5));
  const quando = (data, min) => new Date(`${data}T${pad(Math.floor(min / 60))}:${pad(min % 60)}:00${OFFSET}`);
  const textoMin = (min) => `${Math.floor(min / 60)}h${pad(min % 60)}`;

  // ---------- ícones ----------
  const svg = (corpo) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${corpo}</svg>`;
  const IC = {
    sol: svg('<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    parcial: svg('<path d="M8 2.5v1.5M2.5 8H4M4.1 4.1l1 1M11.9 4.1l-1 1"/><path d="M5.2 10.5A3.5 3.5 0 0 1 11.3 6.6"/><path d="M8 20h10a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6 1.4A2.8 2.8 0 0 0 8 20z"/>'),
    noite: svg('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
    nublado: svg('<path d="M7 19h11a4.5 4.5 0 0 0 .3-9A6 6 0 0 0 6.6 11.6 3.8 3.8 0 0 0 7 19z"/>'),
    chuva: svg('<path d="M7 15h11a4.5 4.5 0 0 0 .3-9A6 6 0 0 0 6.6 7.6 3.8 3.8 0 0 0 7 15z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>'),
    gota: svg('<path d="M12 3s5 5.5 5 9.5a5 5 0 0 1-10 0C7 8.5 12 3 12 3z"/><path d="M10 14a2 2 0 0 0 2 2"/>'),
    calmo: svg('<path d="M2 12h20M2 17h20"/>'),
    onda: svg('<path d="M2 12c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3M2 18c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3"/>'),
    termo: svg('<path d="M10 13.5V5a2 2 0 0 1 4 0v8.5a4 4 0 1 1-4 0z"/>'),
    vento: svg('<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>'),
    escudoOk: svg('<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>'),
    escudoX: svg('<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M10 10l4 4M14 10l-4 4"/>'),
    escudo: svg('<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M12 15h.01M12 8v4"/>'),
    prancha: svg('<path d="M18.5 3.5c2 2-1 9-5 13s-9 5.5-11 3.5 1.5-7 5.5-11 8.5-7.5 10.5-5.5z"/><path d="M6 18l12-12"/>'),
    porDoSol: svg('<path d="M17 18a5 5 0 0 0-10 0M2 18h20M12 4v5M4.2 10.2l1.4 1.4M19.8 10.2l-1.4 1.4"/>'),
    sombra: svg('<path d="M2 20l6-9 4 5 3-3 7 7z"/><path d="M16 4.5a2.5 2.5 0 1 0 0 .01"/>'),
    estrela: svg('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'),
    estrelaCheia: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
    compartilhar: svg('<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>'),
    metro: svg('<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M9 21l-2-4M15 21l2-4"/><circle cx="9" cy="14" r=".6"/><circle cx="15" cy="14" r=".6"/>'),
    camera: svg('<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>'),
    relogio: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')
  };

  // ---------- leitura do tempo ----------
  // Cada hora vira um "estado": sol, parcial (entre nuvens), nublado ou chuva
  const estadoHora = (chuva, nuvens) => chuva >= 50 ? "chuva" : nuvens >= 70 ? "nublado" : nuvens >= 35 ? "parcial" : "sol";

  // Maior sequência de horas seguidas (entre 6h e 20h) que satisfazem a condição
  function maiorSequencia(horas, cond) {
    let melhor = null, ini = null;
    const fim = (h) => { if (ini != null && (!melhor || h - ini > melhor.fim - melhor.ini)) melhor = { ini, fim: h }; ini = null; };
    for (let h = HORA_INI; h <= HORA_FIM; h++) {
      const x = horas.find((y) => y.h === h);
      if (x && cond(x)) { if (ini == null) ini = h; } else fim(h);
    }
    fim(HORA_FIM + 1);
    return melhor;
  }

  function analisar(x, p) {
    const dia = x.horas.filter((y) => y.h >= HORA_INI && y.h <= HORA_FIM);
    const conta = (e) => dia.filter((y) => y.est === e).length;
    const horasSol = conta("sol"), horasParcial = conta("parcial"), horasChuva = conta("chuva");
    const janela = maiorSequencia(x.horas, (y) => y.est === "sol");
    const janelaParcial = maiorSequencia(x.horas, (y) => y.est === "sol" || y.est === "parcial");
    const pancada = dia.find((y) => y.chuva >= 50);
    const nucleo = x.horas.filter((y) => y.h >= 9 && y.h <= 16);
    const n = (e) => nucleo.filter((y) => y.est === e).length;
    const ceu = n("chuva") >= 2 ? "chuva" : n("sol") >= 5 ? "sol" : n("sol") + n("parcial") >= 4 ? "parcial" : "nublado";
    const tam = (j) => j ? j.fim - j.ini : 0;
    const o = x.ondas;

    // --- selos ---
    const selos = [];
    if (ceu === "chuva") selos.push({ cls: "neutro", ic: IC.chuva, t: "Dia de chuva", s: pancada ? `Chuva a partir das ${pancada.h}h` : "Chuva em boa parte do dia" });
    else if (tam(janela) >= 2) selos.push({ cls: "sol", ic: IC.sol, t: tam(janela) >= 5 ? "Solzão" : "Sol", s: `Céu limpo das ${janela.ini}h às ${janela.fim}h` });
    else if (tam(janelaParcial) >= 2) selos.push({ cls: "sol", ic: IC.parcial, t: "Sol entre nuvens", s: `Das ${janelaParcial.ini}h às ${janelaParcial.fim}h` });
    else selos.push({ cls: "neutro", ic: IC.nublado, t: "Céu fechado", s: "Sem sol firme hoje" });

    // UV: pico do dia (com o horário) e, se for hoje, o de agora
    const comUv = x.horas.filter((y) => y.uv != null);
    const pico = comUv.length ? comUv.reduce((m, y) => (y.uv > m.uv ? y : m)) : null;
    const uv = pico ? Math.round(pico.uv) : x.uv;
    const horaJa = +relogio.format(new Date()).slice(0, 2);
    const agoraUv = x.hoje ? comUv.find((y) => y.h === horaJa) : null;
    const uvTxt = (pico ? `Pico ${uv} às ${pico.h}h` : `UV ${uv}`) + (agoraUv ? ` · agora ${Math.round(agoraUv.uv)}` : "");
    if (uv >= 11) selos.push({ cls: "bronze", ic: IC.gota, t: "UV extremo", s: `${uvTxt} · evite o sol do meio-dia` });
    else if (uv >= 8) selos.push({ cls: "bronze", ic: IC.gota, t: "Dia de pegar cor", s: `${uvTxt} · protetor a cada 2h` });
    else if (uv >= 3 && horasSol >= 3) selos.push({ cls: "bronze", ic: IC.gota, t: "Sol gostoso", s: `${uvTxt} · passa protetor` });
    else if (uv >= 3) selos.push({ cls: "bronze", ic: IC.gota, t: "UV moderado", s: `${uvTxt} · queima mesmo nublado` });
    else selos.push({ cls: "neutro", ic: IC.gota, t: "UV baixo", s: "Pouco risco de queimar" });

    if (p.baia) selos.push({ cls: "mar", ic: IC.calmo, t: "Mar de baía", s: "Calminho, sem onda" });
    else if (o == null) selos.push({ cls: "neutro", ic: IC.onda, t: "Mar", s: "Sem dado do mar agora" });
    else if (o < 0.6) selos.push({ cls: "mar", ic: IC.calmo, t: "Piscininha", s: `Mar liso, ondas de ${fmt(o)} m` });
    else if (o < 1.2) selos.push({ cls: "mar", ic: IC.onda, t: "Marolinha", s: `Ondas de ${fmt(o)} m, dá pra nadar` });
    else if (o < 2) selos.push({ cls: "mexido", ic: IC.onda, t: "Mar mexido", s: `Ondas de ${fmt(o)} m` });
    else selos.push({ cls: "ruim", ic: IC.onda, t: "Mar pesado", s: `Ondas de ${fmt(o)} m, cuidado com a correnteza` });

    if (x.agua == null) selos.push({ cls: "neutro", ic: IC.termo, t: "Água", s: "Sem dado da temperatura" });
    else if (x.agua < 20) selos.push({ cls: "frio", ic: IC.termo, t: "Água gelada", s: `${fmt(x.agua)}°C, só pra corajoso` });
    else if (x.agua < 22.5) selos.push({ cls: "frio", ic: IC.termo, t: "Água fresquinha", s: `${fmt(x.agua)}°C, refresca` });
    else selos.push({ cls: "quente", ic: IC.termo, t: "Água quentinha", s: `${fmt(x.agua)}°C, dá pra ficar de molho` });

    // No teste, os modelos previram vento ~3 km/h mais fraco que o real e quase nunca a ventania da tarde.
    // Por isso os limites aqui são mais baixos do que o vento "de verdade" que eles representam.
    // vento: hoje mostra o de agora e o mais forte que ainda vem; outros dias, o pico e a hora
    const horaV = +relogio.format(new Date()).slice(0, 2);
    const comV = x.horas.filter((y) => y.v != null && y.h >= 9 && y.h <= 17);
    const agoraV = x.hoje ? x.horas.find((y) => y.h === horaV && y.v != null) : null;
    const frente = x.hoje ? comV.filter((y) => y.h >= horaV) : comV;
    const picoV = (frente.length ? frente : comV).reduce((m, y) => (!m || y.v > m.v ? y : m), null);
    const ventoRef = picoV ? Math.max(picoV.v, agoraV ? agoraV.v : 0) : x.vento;
    const depois = picoV && agoraV && picoV.h > horaV + 1 && picoV.v - agoraV.v >= 5;
    const quandoV = depois ? ` às ${picoV.h}h` : "";
    const subV = agoraV ? `Agora ${agoraV.v} km/h` + (depois ? ` · chega a ${picoV.v} às ${picoV.h}h` : "")
      : picoV ? `Até ${picoV.v} km/h${picoV.h ? ` (${picoV.h}h)` : ""}` : `${x.vento} km/h`;
    if (ventoRef <= 10) selos.push({ cls: "neutro", ic: IC.vento, t: "Vento fraco", s: `${subV} · dia de altinha` });
    else if (ventoRef <= 15) selos.push({ cls: "neutro", ic: IC.vento, t: depois ? `Brisa${quandoV}` : "Brisa", s: `${subV} · guarda-sol firme` });
    else if (ventoRef <= 20) selos.push({ cls: "mexido", ic: IC.vento, t: depois ? `Vento aumenta${quandoV}` : "Vento moderado", s: `${subV} · finca bem o guarda-sol` });
    else selos.push({ cls: "ruim", ic: IC.vento, t: depois ? `Ventania${quandoV}` : "Ventania", s: `${subV} · areia voando` });

    // água: o último boletim do INEA como ele é (própria ou imprópria), com a data
    const dataBol = x.aguaData ? x.aguaData.slice(8, 10) + "/" + x.aguaData.slice(5, 7) : null;
    const bol = dataBol ? `Último boletim INEA · ${dataBol}` : "Boletim do INEA";
    if (x.propria === true) selos.push({ cls: "ok", ic: IC.escudoOk, t: "Água própria", s: bol });
    else if (x.propria === false) selos.push({ cls: "ruim", ic: IC.escudoX, t: "Água imprópria", s: bol });
    else if (x.aguaTotal) selos.push({ cls: "sol", ic: IC.escudo, t: `Própria em ${x.aguaOk} de ${x.aguaTotal} pontos`, s: bol });
    else selos.push({ cls: "neutro", ic: IC.escudo, t: "Água", s: "Sem boletim do INEA" });

    if (!p.baia && o != null && o >= 1 && o <= 2.4 && x.vento <= 15)
      selos.push({ cls: "mar", ic: IC.prancha, t: "Onda pra surfar", s: `${fmt(o)} m · vento ${x.vento} km/h` });

    // --- frase do dia ---
    let ceuTxt;
    if (ceu === "chuva") ceuTxt = pancada ? `Dia de chuva, a partir das ${pancada.h}h` : "Dia de chuva";
    else if (tam(janela) >= 5) ceuTxt = `Solzão das ${janela.ini}h às ${janela.fim}h`;
    else if (tam(janela) >= 2) ceuTxt = `Sol das ${janela.ini}h às ${janela.fim}h`;
    else if (tam(janelaParcial) >= 2) ceuTxt = tam(janelaParcial) <= 3 && ceu === "nublado"
      ? `Sol só das ${janelaParcial.ini}h às ${janelaParcial.fim}h, depois fecha` : "Sol entre nuvens";
    else ceuTxt = "Céu fechado o dia todo";

    const resto = [];
    const marTxt = p.baia ? "mar calminho" : o == null ? null : o < 0.6 ? "mar piscininha" : o < 1.2 ? "mar tranquilo" : o < 2 ? "mar mexido" : "mar pesado";
    if (marTxt) resto.push(marTxt);
    if (ventoRef > 20) resto.push(depois ? `ventania a partir das ${picoV.h}h` : "ventania");
    else if (ventoRef > 15) resto.push(depois ? `vento aumentando lá pelas ${picoV.h}h` : "vento moderado");
    if (x.propria === true) resto.push("água própria");
    if (x.propria === false) resto.push("água imprópria");

    const tom = (horasSol >= 5 && x.vento <= 15 && (p.baia || o == null || o < 1.6) && x.chuvaMax < 40 && x.propria !== false) ? "bom"
      : ((horasSol <= 1 && (ceu === "nublado" || ceu === "chuva")) || (ceu === "chuva" && x.chuvaMax >= 70)) ? "ruim" : "medio";
    // frase curta: o céu, a chuva e só o que for muito importante (o resto está nos selos)
    const fecho = tom === "bom" ? " Dia de praia raiz!" : "";
    const chuvaTxt = ceu !== "chuva" && pancada ? `, com chance de pancada às ${pancada.h}h` : "";
    const alerta = x.propria === false ? " Água imprópria hoje." : ventoRef > 20 ? (depois ? ` Ventania a partir das ${picoV.h}h.` : " Ventania.") : "";
    const veredito = ceuTxt + chuvaTxt + "." + alerta + fecho;

    const resumo = [ceu === "chuva" ? "Chuva" : tam(janela) >= 2 ? `Sol ${janela.ini}h–${janela.fim}h` : tam(janelaParcial) >= 2 ? "Entre nuvens" : "Nublado", marTxt ? marTxt.replace("mar ", "") : null,
      ventoRef > 20 ? "ventania" : ventoRef > 15 ? "ventando" : null, x.propria === false ? "imprópria" : null].filter(Boolean).join(" · ");

    const score = horasSol * 2 + horasParcial * 0.5 - horasChuva - (x.vento > 20 ? 3 : x.vento > 15 ? 1 : 0) - (!p.baia && o != null && o > 1.6 ? 1.5 : 0) - (x.propria === false ? 5 : 0) + (p.baia ? 0 : 0.5) + (x.propria === true ? 0.5 : 0) + (x.propria == null && x.aguaTotal ? (x.aguaOk / x.aguaTotal - 0.5) * 2 : 0);
    selos.forEach((s, i) => { s.k = ["ceu", "uv", "mar", "agua", "vento", "inea", "surfe"][i]; });
    return { horasSol, janela, ceu, tom, selos, veredito, resumo, score };
  }

  // ---------- cena desenhada (muda com o tempo do dia) ----------
  function cena(a, x, p) {
    // Só fica escuro quando é dia de chuva. Nublado sem chuva é cinza claro, calmo.
    const escura = a.ceu === "chuva";
    const cinza = a.ceu === "nublado";
    const ceuCor = { sol: "#BFE6F7", parcial: "#D4E6EF", nublado: "#B4BEC6", chuva: "#4B5862" }[a.ceu];
    const morro = escura ? "#33423A" : cinza ? "#566B5D" : "#2E6B4F", morro2 = escura ? "#2B3A33" : cinza ? "#4A5E51" : "#245A42";
    const mar = escura ? "#34505E" : cinza ? "#6C8C99" : p.baia ? "#3DA9C9" : "#1C9AC4";
    const espuma = escura ? "#A9BCC6" : cinza ? "#B5C7CF" : "#8FD6EC";
    const areia = escura ? "#A89C86" : cinza ? "#D8CDB7" : "#F3DFB8";
    const o = p.baia ? 0.3 : x.ondas == null ? 0.8 : x.ondas;
    let s = `<svg viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="400" height="230" fill="${ceuCor}"/>`;
    if (a.ceu === "sol") s += `<circle cx="330" cy="44" r="26" fill="#FFB627"/><g stroke="#FFB627" stroke-width="5" stroke-linecap="round"><path d="M330 8v-6M330 80v6M294 44h-6M366 44h6M305 19l-4-4M355 69l4 4M305 69l-4 4M355 19l4-4"/></g>`;
    if (a.ceu === "parcial") s += `<circle cx="300" cy="62" r="30" fill="#FFB627"/><path d="M250 98h120a26 26 0 0 0 2-52 34 34 0 0 0-64-4 24 24 0 0 0-58 56z" fill="#FFFFFF" opacity="0.95"/><path d="M40 70h80a18 18 0 0 0 1-36 24 24 0 0 0-45-4 16 16 0 0 0-36 40z" fill="#FFFFFF" opacity="0.85"/>`;
    if (cinza) {
      s += `<path d="M-20 64h150a30 30 0 0 0 2-60 40 40 0 0 0-76-6 28 28 0 0 0-76 66z" fill="#D3DAE0"/><path d="M200 90h170a28 28 0 0 0 2-56 38 38 0 0 0-72-8 26 26 0 0 0-100 64z" fill="#C7CFD6"/><path d="M100 114h110a22 22 0 0 0 1-44 30 30 0 0 0-56-5 20 20 0 0 0-55 49z" fill="#DDE3E8"/>`;
    }
    if (escura) {
      const c = ["#45525B", "#3F4B54", "#38434B"];
      s += `<path d="M-20 64h150a30 30 0 0 0 2-60 40 40 0 0 0-76-6 28 28 0 0 0-76 66z" fill="${c[0]}"/><path d="M200 90h170a28 28 0 0 0 2-56 38 38 0 0 0-72-8 26 26 0 0 0-100 64z" fill="${c[1]}"/><path d="M100 114h110a22 22 0 0 0 1-44 30 30 0 0 0-56-5 20 20 0 0 0-55 49z" fill="${c[2]}"/>`;
      s += `<g stroke="#9AAAB5" stroke-width="2" stroke-linecap="round" opacity="0.9"><path d="M40 86l-6 14M72 90l-6 14M240 106l-6 14M274 102l-6 14M314 108l-6 14M140 126l-5 12M180 124l-5 12M110 92l-6 14M350 96l-6 14M210 128l-5 12"/></g>`;
    }
    // paisagem da praia: silhueta real dos morros vista da areia (calculada com o relevo por satélite)
    const longeCor = escura ? "#3D4A45" : cinza ? "#7D8E86" : "#6F9C8C";
    const perfil = (window.PAISAGENS || {})[p.id];
    const desenho = (window.SILHUETAS || {})[p.id];
    if (desenho) {
      const pedraCor = escura ? "#4A4744" : cinza ? "#8C8781" : "#A39282";
      desenho.camadas.forEach((c) => {
        const cor = c.pedra ? pedraCor : c.longe ? longeCor : morro;
        s += `<path d="M${c.pts.map((q) => q[0] + " " + q[1]).join(" L")} Z" fill="${cor}" stroke="${cor}" stroke-width="1.5" stroke-linejoin="round"${c.opac ? ` opacity="${c.opac}"` : ""}/>`;
      });
    } else if (perfil) {
      const pxGrau = 400 / perfil.fov;
      const maior = Math.max(...perfil.perto, ...perfil.longe, 0.1);
      const k = Math.min(Math.max(pxGrau * 2, 55 / maior), 80 / maior);
      const linha = (arr) => {
        const n = arr.length - 1;
        const suave = arr.map((v, i) => (arr[Math.max(0, i - 1)] + 2 * v + arr[Math.min(n, i + 1)]) / 4);
        return "M-2 142 " + suave.map((v, i) => `L${(i * 404 / n - 2).toFixed(1)} ${(142 - v * k).toFixed(1)}`).join(" ") + " L402 142 Z";
      };
      s += `<path d="${linha(perfil.longe)}" fill="${longeCor}"/><path d="${linha(perfil.perto)}" fill="${morro}"/>`;
    } else {
      s += `<path d="M0 142 C 26 122, 50 108, 74 114 C 92 118, 102 102, 124 98 C 146 95, 164 124, 192 142 Z" fill="${morro}"/>`;
    }
    if (x.vento > 15) s += `<g stroke="${escura ? "#C9D3DA" : cinza ? "#9AAAB5" : "#FFFFFF"}" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.9"><path d="M236 100h70a10 10 0 1 0-10-10M256 116h90a10 10 0 1 1-10 10M226 132h50"/></g>`;
    s += `<rect x="0" y="140" width="400" height="56" fill="${mar}"/>`;
    if (o < 0.6) s += `<path d="M0 154H400M30 170H130M210 176H330" stroke="${espuma}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`;
    else {
      const amp = o < 1.2 ? 5 : o < 2 ? 9 : 12, w = o < 1.2 ? 20 : 28;
      const onda = (y) => { let d = `M0 ${y}`; for (let xx = 0; xx < 400; xx += w) d += ` q ${w / 2} ${-amp} ${w} 0`; return d; };
      s += `<path d="${onda(156)}" stroke="${espuma}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="${onda(178)}" stroke="${espuma}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>`;
    }
    s += `<rect x="0" y="192" width="400" height="38" fill="${areia}"/>`;
    if (desenho && desenho.barcos) {
      const casco = escura ? "#8A949B" : "#FFFFFF", vela = escura ? "#AEB7BD" : "#F6F3EC", mastro = escura ? "#6E7C85" : "#5A6B78";
      desenho.barcos.forEach(([bx, t]) => {
        const by = 152 + t * 4;
        s += `<g transform="translate(${bx},${by}) scale(${t})"><path d="M-12 0 L12 0 L8 5 L-8 5 Z" fill="${casco}"/><path d="M0 0 V-26" stroke="${mastro}" stroke-width="1.5"/><path d="M1 -24 L1 -2 L13 -2 Z" fill="${vela}"/><path d="M-1 -20 L-1 -2 L-9 -2 Z" fill="${vela}" opacity="0.85"/></g>`;
      });
    }
    if (desenho && desenho.calcadao) {
      // calçadão de Copacabana: ondas pretas sobre pedra portuguesa branca
      const claro = escura ? "#BDB8AE" : cinza ? "#E4E1DA" : "#F4F1EA", preto = escura ? "#2A2D30" : cinza ? "#3E4144" : "#23262A";
      s += `<rect x="0" y="198" width="400" height="32" fill="${claro}"/>`;
      let ondas = "";
      for (let k = 0; k < 3; k++) {
        const y = 204 + k * 11;
        let d = `M-20 ${y}`;
        for (let xx = -20; xx < 420; xx += 40) d += ` q 10 -6 20 0 t 20 0`;
        ondas += `<path d="${d}" stroke="${preto}" stroke-width="5" fill="none"/>`;
      }
      s += ondas;
    }
    if (desenho && desenho.palmeiras) {
      const tronco = escura ? "#3B3530" : cinza ? "#6E6458" : "#8A6A45", folha = escura ? "#2B3A33" : cinza ? "#4A5E51" : "#2F7A4A";
      desenho.palmeiras.forEach(([px, alt, inc, base = 214]) => {
        const topoX = px + inc, topoY = base - alt;
        s += `<path d="M${px} ${base} Q ${px + inc * 2} ${base - alt / 2} ${topoX} ${topoY}" stroke="${tronco}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
        s += `<g stroke="${folha}" stroke-width="6" fill="none" stroke-linecap="round">` +
          [[-34, 14], [-26, 26], [-8, 30], [12, 28], [30, 22], [36, 8], [-38, 2]].map(([dx, dy]) =>
            `<path d="M${topoX} ${topoY} q ${dx / 2} ${-12 + dy / 4} ${dx} ${dy}"/>`).join("") + `</g>`;
      });
    }
    if (!escura && !cinza) s += `<path d="M0 194 C 70 188, 130 198, 200 192 C 270 186, 330 196, 400 191 V200 H0 Z" fill="#FFFFFF" opacity="0.6"/>`;
    return { svg: s + "</svg>", escura };
  }

  // ---------- estado ----------
  const estado = {
    dia: 0,
    sel: null,                 // praia escolhida pelo usuário (null = a melhor do dia)
    regiao: matchMedia("(max-width:640px)").matches ? "zs" : "todas",
    minuto: null               // horário escolhido no controle do sol (minutos desde 0h)
  };

  let previsao = null;     // previsao[idPraia][indiceDia]
  let datas = [];
  let linhas = [];         // praias do dia selecionado, já analisadas
  let balneab = { praias: {} };
  const horizontes = {};   // ângulo do relevo por praia (36 direções) ou "carregando" / "erro"

  // ---------- busca da previsão ----------
  const listaLat = () => PRAIAS.map((p) => p.lat).join(","), listaLon = () => PRAIAS.map((p) => p.lon).join(",");
  const urlPrevisao = () => "https://api.open-meteo.com/v1/forecast?latitude=" + listaLat() + "&longitude=" + listaLon() +
    "&hourly=temperature_2m,precipitation_probability,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index" +
    "&daily=sunrise,sunset,uv_index_max&timezone=" + encodeURIComponent(FUSO) + "&forecast_days=7";
  // Nuvens: média de 9 modelos. No teste de set-out/2026 (Santos Dumont e Jacarepaguá)
  // a média acertou mais se ia ter sol do que qualquer modelo sozinho.
  const MODELOS_NUVEM = ["ecmwf_ifs025", "ecmwf_aifs025_single", "gfs_seamless", "icon_seamless", "meteofrance_seamless", "ukmo_seamless", "jma_seamless", "gem_seamless", "cma_grapes_global"];
  const urlNuvens = () => "https://api.open-meteo.com/v1/forecast?latitude=" + listaLat() + "&longitude=" + listaLon() +
    "&hourly=cloud_cover,wind_speed_10m&models=" + MODELOS_NUVEM.join(",") + "&timezone=" + encodeURIComponent(FUSO) + "&forecast_days=7";
  const urlMar = () => "https://marine-api.open-meteo.com/v1/marine?latitude=" + listaLat() + "&longitude=" + listaLon() +
    "&hourly=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period,secondary_swell_wave_height,secondary_swell_wave_direction,secondary_swell_wave_period,wind_wave_height,wind_wave_direction,sea_surface_temperature,sea_level_height_msl&timezone=" + encodeURIComponent(FUSO) + "&forecast_days=7";

  async function buscarJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }
  async function carregar(forcar) {
    const cache = guarda.ler(CACHE_CHAVE);
    if (!forcar && cache && Date.now() - cache.t < CACHE_MIN * 60000) return cache;
    const [tempo, mar, nuvens] = await Promise.all([buscarJSON(urlPrevisao()), buscarJSON(urlMar()).catch(() => null), buscarJSON(urlNuvens()).catch(() => null)]);
    const novo = { t: Date.now(), tempo, mar, nuvens };
    guarda.gravar(CACHE_CHAVE, novo);
    return novo;
  }

  // ---------- metrô mais perto ----------
  // Compara a praia e os postos dela com as estações; a pé ~ 80 m por minuto, com 20% a mais pelas ruas.
  const POSTOS_DA_PRAIA = { flamengo: ["Flamengo"], leme: ["Leme"], copacabana: ["Copacabana"], arpoador: ["Arpoador"], ipanema: ["Ipanema"],
    leblon: ["Leblon"], saoconrado: ["São Conrado"], barra: ["Barra", "Quebra-Mar"], recreio: ["Recreio"] };
  function distKm(a1, o1, a2, o2) {
    const k = Math.PI / 180, x = (o2 - o1) * k * Math.cos((a1 + a2) / 2 * k), y = (a2 - a1) * k;
    return Math.hypot(x, y) * 6371;
  }
  // Todas as estações a até ~20 min a pé da praia. Para cada estação, o posto mais perto dela.
  // Praias longas (Copacabana, Ipanema, Barra…) têm várias; a lista vem na ordem da praia.
  function metroPerto(p) {
    const postos = (window.POSTOS || []).map((q, i) => ({ lat: q[1], lon: q[2], posto: q[0], ordem: i }))
      .filter((q, i) => (POSTOS_DA_PRAIA[p.id] || []).includes(window.POSTOS[i][3]));
    // pontos extras de acesso que não são postos (ex.: o Leme começa na Av. Princesa Isabel)
    const EXTRAS = { leme: [{ lat: -22.9653, lon: -43.1724, posto: "Av. Princesa Isabel", ordem: -1 }] };
    const pontos = (EXTRAS[p.id] || []).concat(postos.length ? postos : [{ lat: p.lat, lon: p.lon, posto: null, ordem: 0 }]);
    const lista = [];
    for (const e of window.METRO || []) {
      let melhor = null;
      for (const pt of pontos) { const d = distKm(pt.lat, pt.lon, e[1], e[2]); if (!melhor || d < melhor.d) melhor = { nome: e[0], d, posto: pt.posto, ordem: pt.ordem }; }
      melhor.min = Math.max(2, Math.round(melhor.d * 1200 / 80));
      lista.push(melhor);
    }
    lista.sort((a, b) => a.min - b.min);
    // fica com as que dão até 20 min a pé, uma estação por posto (a mais perto dele);
    // se nenhuma, a mais perto se for até ~27 min
    const usados = new Set();
    let perto = lista.filter((m) => m.min <= 20).filter((m) => { const k = m.posto ?? m.nome; if (usados.has(k)) return false; usados.add(k); return true; });
    if (!perto.length && lista[0] && lista[0].min <= 27) perto = [lista[0]];
    return perto.sort((a, b) => a.ordem - b.ordem || a.min - b.min);
  }
  function htmlMetro(p) {
    const ms = metroPerto(p);
    if (!ms.length) return "";
    const nomePosto = (n) => n === "QM" ? "Quebra-Mar" : /^\d+$/.test(n) ? "Posto " + n : n;
    if (ms.length === 1) {
      const m = ms[0];
      return `<div class="info metro">${IC.metro}<span><b>Metrô ${m.nome}</b>, uns ${m.min} min a pé${m.posto ? ` até ${/^\d+$|^QM$/.test(m.posto) ? "o " : "a "}${nomePosto(m.posto)}` : ""}.</span></div>`;
    }
    return `<div class="info metro">${IC.metro}<div class="metro-c"><b>Metrô</b> <small>Escolha pelo pedaço da praia</small>
      <ul>${ms.map((m) => `<li><b>${m.nome}</b>${m.posto ? ` → ${nomePosto(m.posto)}` : ""} <span>· ${m.min} min</span></li>`).join("")}</ul></div></div>`;
  }

  // ---------- maré ----------
  // O modelo do Open-Meteo (nível do mar com maré) adianta uns 45 min em relação à tábua de marés
  // do Rio (comparado em out/2026). Corrigimos aqui.
  const MARE_ATRASO = 45;
  function extremosMare(m) {
    if (!m || !m.hourly || !m.hourly.sea_level_height_msl) return [];
    const t = m.hourly.time, v = m.hourly.sea_level_height_msl, out = [];
    for (let k = 1; k < v.length - 1; k++) {
      const a = v[k - 1], b = v[k], c = v[k + 1];
      if (a == null || b == null || c == null) continue;
      const alta = b > a && b >= c, baixa = b < a && b <= c;
      if (!alta && !baixa) continue;
      const den = a - 2 * b + c, d = den ? 0.5 * (a - c) / den : 0;      // ajuste fino entre as horas
      const ts = t[k], min = (+ts.slice(11, 13)) * 60 + Math.round(d * 60) + MARE_ATRASO;
      const dia = new Date(ts.slice(0, 10) + "T12:00:00Z"); dia.setUTCDate(dia.getUTCDate() + Math.floor(min / 1440));
      out.push({ data: dia.toISOString().slice(0, 10), min: ((min % 1440) + 1440) % 1440, tipo: alta ? "alta" : "baixa", nivel: b });
    }
    return out;
  }
  // Gráfico de barras do UV hora a hora (6h às 20h), cada barra com a cor da faixa de risco (escala da OMS)
  const FAIXAS_UV = [
    { ate: 2, nome: "Leve", cor: "#4CAF50" },
    { ate: 5, nome: "Moderado", cor: "#F2C12E" },
    { ate: 7, nome: "Alto", cor: "#F28C28" },
    { ate: 10, nome: "Muito alto", cor: "#E0412E" },
    { ate: 99, nome: "Extremo", cor: "#8E44AD" }
  ];
  const faixaUv = (v) => FAIXAS_UV.find((f) => v <= f.ate + 0.49);
  function graficoUv(x) {
    const hs = x.horas.filter((y) => y.uv != null && y.h >= HORA_INI && y.h <= HORA_FIM);
    if (hs.length < 6) return "";
    const W = 320, topo = 18, base = 84, H = 102, larg = W / hs.length, gap = 4, alto = base - topo, max = 12;
    const agoraH = x.hoje ? +relogio.format(new Date()).slice(0, 2) : -1;
    const pico = hs.reduce((m, y) => (y.uv > m.uv ? y : m));
    const agora = hs.find((y) => y.h === agoraH);
    const barras = hs.map((y, i) => {
      const v = Math.round(y.uv), f = faixaUv(y.uv);
      const x0 = i * larg + gap / 2, w = larg - gap, alt = Math.max(3, Math.min(v, max) / max * alto), y0 = base - alt;
      const ag = y.h === agoraH;
      return `<rect x="${x0}" y="${y0}" width="${w}" height="${alt}" rx="4" fill="${f.cor}"${ag ? ' stroke="#10283A" stroke-width="2"' : ""}/>
        ${v >= 1 ? `<text x="${x0 + w / 2}" y="${y0 - 4}" text-anchor="middle" font-size="10" font-weight="800" fill="#10283A">${v}</text>` : ""}
        ${ag || (y.h % 2 === 0 && Math.abs(y.h - agoraH) > 1) ? `<text x="${x0 + w / 2}" y="${base + 13}" text-anchor="middle"${ag ? ' font-weight="800" fill="#10283A"' : ""}>${ag ? "Agora" : y.h + "h"}</text>` : ""}`;
    }).join("");
    // recomendação de saúde conforme o pico do dia
    const SAUDE = {
      "Leve": "Risco baixo para a pele.",
      "Moderado": "Use protetor solar.",
      "Alto": "Protetor, chapéu e óculos.",
      "Muito alto": "Protetor FPS 50 e reaplique sempre.",
      "Extremo": "Queima rápido: proteção máxima."
    };
    const dica = SAUDE[faixaUv(pico.uv).nome];
    const chip = (t, f, cl) => `<span class="chip" style="font-weight:800;font-size:13px;border-radius:999px;padding:4px 10px;background:${f.cor};color:${cl}">${t}</span>`;
    const corTexto = (f) => (f.nome === "Moderado" ? "#3D2E00" : "#fff");
    const legenda = FAIXAS_UV.map((f) => `<span style="display:inline-flex;align-items:center;gap:4px"><i style="width:10px;height:10px;border-radius:3px;background:${f.cor};display:inline-block"></i>${f.nome}</span>`).join("");
    return `<div class="info uv" style="display:block;background:#FFF3EC;color:#5A2410"><div style="display:grid;gap:8px">
      <div style="display:flex;justify-content:space-between;align-items:center"><b style="display:flex;align-items:center;gap:8px;font-size:15px">${IC.sol.replace("<svg", '<svg style="width:22px;height:22px"')}Índice UV</b>${agora ? `<span style="display:flex;align-items:center;gap:8px;background:${faixaUv(agora.uv).cor};color:${corTexto(faixaUv(agora.uv))};border-radius:14px;padding:4px 10px 4px 12px"><small style="font-size:11px;font-weight:700;line-height:1.1;text-align:right">AGORA<br>${faixaUv(agora.uv).nome}</small><b style="font-size:26px;line-height:1">${Math.round(agora.uv)}</b></span>` : '<small style="opacity:.7;font-size:12px">Hora a hora</small>'}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${chip(`Pico ${Math.round(pico.uv)} às ${pico.h}h · ${faixaUv(pico.uv).nome}`, faixaUv(pico.uv), corTexto(faixaUv(pico.uv)))}</div>
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" font-size="10" font-weight="600" fill="#6B4A3A" role="img" aria-label="UV hora a hora. Pico ${Math.round(pico.uv)} às ${pico.h}h.">${barras}</svg>
      <div style="display:flex;flex-wrap:wrap;gap:4px 8px;font-size:10.5px;opacity:.85">${legenda}</div>
      <div style="font-size:14px;line-height:1.35">${dica}</div>
    </div></div>`;
  }

  // Gráfico de barras da maré (6h às 19h) + resumo bem curto.
  // Cada coluna é um pedaço de praia: a areia (bege) por cima e a água (azul) subindo por baixo.
  // Quanto mais azul, maré mais cheia e menos areia.
  function graficoMare(x) {
    const hs = x.mareHoras || [];
    if (hs.length < 6) return "";
    const hh = (m) => { m = Math.round(m / 5) * 5; return m % 60 ? `${Math.floor(m / 60)}h${pad(m % 60)}` : `${m / 60}h`; };
    const ns = hs.map((q) => q.n), lo = Math.min(...ns), hi = Math.max(...ns), amp = hi - lo || 1;
    const agoraH = estado.dia === 0 ? +relogio.format(new Date()).slice(0, 2) : -1;
    const W = 320, topo = 16, base = 84, H = 104, larg = W / hs.length, gap = 4, alto = base - topo;
    const dia = (x.mares || []).filter((e) => e.min >= 6 * 60 - 30 && e.min <= 20 * 60 + 30);
    const horaDe = (e) => Math.round(e.min / 60);
    const colunas = hs.map((q, i) => {
      const x0 = i * larg + gap / 2, w = larg - gap;
      const agua = 0.18 + 0.72 * (q.n - lo) / amp;              // fração da coluna coberta de água
      const ya = base - alto * agua;
      const marca = dia.find((e) => horaDe(e) === q.h);
      const ag = q.h === agoraH;
      return `<g${ag ? ' class="ag"' : ""}>
        <rect x="${x0}" y="${topo}" width="${w}" height="${alto}" rx="5" fill="#F3DFB5"/>
        <rect x="${x0}" y="${ya}" width="${w}" height="${base - ya}" rx="5" fill="url(#mareAgua)"/>
        ${ag ? `<rect x="${x0 - 1.5}" y="${topo - 1.5}" width="${w + 3}" height="${alto + 3}" rx="6" fill="none" stroke="#10283A" stroke-width="2"/>` : ""}
        ${marca ? `<text x="${x0 + w / 2}" y="${topo - 4}" text-anchor="middle" class="m-${marca.tipo}" font-size="11" fill="${marca.tipo === "alta" ? "#1F6F9F" : "#B08A3A"}">${marca.tipo === "alta" ? "▲" : "▼"}</text>` : ""}
        ${ag || (q.h % 2 === 0 && Math.abs(q.h - agoraH) > 1) ? `<text x="${x0 + w / 2}" y="${base + 13}" text-anchor="middle"${ag ? ' class="t-ag" fill="#10283A" font-weight="800"' : ""}>${ag ? "Agora" : q.h + "h"}</text>` : ""}
      </g>`;
    }).join("");
    const baixa = dia.find((e) => e.tipo === "baixa" && e.min >= 6 * 60 && e.min <= 20 * 60), alta = dia.find((e) => e.tipo === "alta" && e.min >= 6 * 60 && e.min <= 20 * 60);
    const muita = hs.filter((q) => q.n - lo <= amp * 0.35).map((q) => q.h);
    let faixa = "";
    if (muita.length) {
      const grupos = []; muita.forEach((h) => { const g = grupos[grupos.length - 1]; if (g && h === g[1] + 1) g[1] = h; else grupos.push([h, h]); });
      faixa = grupos.filter(([a, b]) => b > a).map(([a, b]) => b >= 20 ? `a partir das ${a}h` : a <= 6 ? `até as ${b + 1}h` : `das ${a}h às ${b + 1}h`).join(" e ");
    }
    const chips = [baixa ? `<span class="chip baixa" style="font-weight:800;font-size:13px;border-radius:999px;padding:4px 10px;background:#F3DFB5;color:#6B4F12">▼ Baixa ${hh(baixa.min)}</span>` : "", alta ? `<span class="chip alta" style="font-weight:800;font-size:13px;border-radius:999px;padding:4px 10px;background:#1F6F9F;color:#fff">▲ Alta ${hh(alta.min)}</span>` : ""].join("");
    return `<div class="info mare" style="display:block"><div class="mare-c" style="display:grid;gap:8px">
      <div class="mare-t" style="display:flex;justify-content:space-between;align-items:center"><b style="display:flex;align-items:center;gap:8px;font-size:15px">${IC.onda.replace("<svg", '<svg style="width:22px;height:22px"')}Maré</b><small style="opacity:.7;font-size:12px">Horários aprox.</small></div>
      <div class="chips" style="display:flex;gap:6px;flex-wrap:wrap">${chips}</div>
      <svg viewBox="0 0 ${W} ${H}" class="mare-g" style="width:100%;height:auto;display:block" font-size="10" font-weight="600" fill="#4A6A7A" role="img" aria-label="Maré de hora em hora.${baixa ? " Baixa às " + hh(baixa.min) + "." : ""}${alta ? " Alta às " + hh(alta.min) + "." : ""}${faixa ? " Mais areia " + faixa + "." : ""}">
        <defs><linearGradient id="mareAgua" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4FB3D9"/><stop offset="1" stop-color="#1F6F9F"/></linearGradient></defs>
        ${colunas}
      </svg>
      ${faixa ? `<div class="mare-dica">🏖️ <b>Mais areia ${faixa}</b></div>` : ""}
    </div></div>`;
  }

  function textoMare(mares) {
    if (!mares || mares.length < 2) return null;
    const hh = (m) => { m = Math.round(m / 5) * 5; return m % 60 ? `${Math.floor(m / 60)}h${pad(m % 60)}` : `${m / 60}h`; };
    const ini = 6 * 60, fim = 20 * 60;
    const dia = mares.filter((e) => e.min >= ini - 120 && e.min <= fim + 120);
    const partes = [];
    const baixa = mares.find((e) => e.tipo === "baixa" && e.min >= ini && e.min <= fim);
    const alta = mares.find((e) => e.tipo === "alta" && e.min >= ini && e.min <= fim);
    // trechos entre um extremo e outro que caem no horário de praia
    const linhas = [];
    for (let i = 0; i < mares.length - 1; i++) {
      const a = mares[i], b = mares[i + 1];
      const de = Math.max(a.min, ini), ate = Math.min(b.min, fim);
      if (ate - de < 45) continue;
      linhas.push(a.tipo === "baixa"
        ? `⬆️ <b>${hh(de)} às ${hh(ate)}</b>: maré sobe, menos areia`
        : `⬇️ <b>${hh(de)} às ${hh(ate)}</b>: maré desce, mais areia`);
    }
    if (baixa) partes.push(`Maré baixa às <b>${hh(baixa.min)}</b>: areia mais larga.`);
    if (alta) partes.push(`Maré alta às <b>${hh(alta.min)}</b>: menos areia.`);
    return { resumo: partes.join(" "), linhas, dia };
  }

  function montar({ tempo, mar, nuvens }) {
    const T = Array.isArray(tempo) ? tempo : [tempo];
    const M = mar ? (Array.isArray(mar) ? mar : [mar]) : [];
    const N = nuvens ? (Array.isArray(nuvens) ? nuvens : [nuvens]) : [];
    datas = T[0].daily.time;
    const out = {};
    PRAIAS.forEach((p, i) => {
      const t = T[i], m = M[i], h = t.hourly;
      // média das nuvens dos vários modelos, hora a hora (se não vier, usa a previsão padrão)
      const nuvemMedia = {}, ventoMeio = {};
      if (N[i] && N[i].hourly) {
        const nh = N[i].hourly;
        nh.time.forEach((ts, k) => {
          const xs = MODELOS_NUVEM.map((md) => (nh["cloud_cover_" + md] || [])[k]).filter((v) => v != null);
          if (xs.length >= 3) nuvemMedia[ts] = media(xs);
          // vento: o valor do meio entre os modelos (um modelo exagerado sozinho não manda mais)
          const vs = MODELOS_NUVEM.map((md) => (nh["wind_speed_10m_" + md] || [])[k]).filter((v) => v != null).sort((a, b) => a - b);
          if (vs.length >= 3) ventoMeio[ts] = vs.length % 2 ? vs[(vs.length - 1) / 2] : (vs[vs.length / 2 - 1] + vs[vs.length / 2]) / 2;
        });
      }
      const todasMares = extremosMare(m);
      // nível do mar hora a hora, já com a correção de horário (valor do modelo 45 min antes)
      const nivelEm = (data, h) => {
        if (!m || !m.hourly || !m.hourly.sea_level_height_msl) return null;
        const t = m.hourly.time, v = m.hourly.sea_level_height_msl;
        const k = t.indexOf(`${data}T${pad(h)}:00`); if (k < 1 || v[k] == null || v[k - 1] == null) return null;
        const f = MARE_ATRASO / 60; return v[k] * (1 - f) + v[k - 1] * f;
      };
      out[p.id] = datas.map((data, d) => {
        const idx = [];
        h.time.forEach((ts, k) => {
          const hr = +ts.slice(11, 13);
          if (ts.slice(0, 10) === data && hr >= HORA_INI && hr <= HORA_FIM) idx.push(k);
        });
        const val = (arr) => idx.map((k) => arr[k]).filter((v) => v != null);
        const ventoEm = (k) => { const v = ventoMeio[h.time[k]] ?? h.wind_speed_10m[k]; return v == null ? null : Math.round(v); };
        const temps = val(h.temperature_2m), chuvas = val(h.precipitation_probability), ventos = idx.map(ventoEm).filter((v) => v != null);
        let ondas = null, aguaT = null;
        if (m && m.hourly) {
          const mi = [];
          m.hourly.time.forEach((ts, k) => { const hr = +ts.slice(11, 13); if (ts.slice(0, 10) === data && hr >= HORA_INI && hr <= HORA_FIM) mi.push(k); });
          const w = mi.map((k) => m.hourly.wave_height[k]).filter((v) => v != null);
          const s = mi.map((k) => m.hourly.sea_surface_temperature[k]).filter((v) => v != null);
          if (w.length) ondas = Math.max(...w);
          if (s.length) aguaT = media(s);
        }
        if (p.baia && ondas != null) ondas = Math.min(ondas, 0.5);
        const prop = balneab.praias[p.id];
        return {
          data,
          temp: temps.length ? Math.round(Math.max(...temps)) : 0,
          chuvaMax: chuvas.length ? Math.max(...chuvas) : 0,
          // vento do dia: o mais forte no horário de praia (9h às 17h), não o do dia inteiro
          vento: (() => { const vs = idx.filter((k) => { const hr = +h.time[k].slice(11, 13); return hr >= 9 && hr <= 17; }).map(ventoEm).filter((v) => v != null); return vs.length ? Math.round(Math.max(...vs)) : (ventos.length ? Math.round(Math.max(...ventos)) : 0); })(),
          uv: Math.round(t.daily.uv_index_max[d] || 0),
          hoje: d === 0,
          ondas: ondas == null ? null : Math.round(ondas * 10) / 10,
          agua: aguaT == null ? null : Math.round(aguaT * 10) / 10,
          nascer: (t.daily.sunrise[d] || "").slice(11, 16) || "05:30",
          porDoSol: (t.daily.sunset[d] || "").slice(11, 16) || "18:30",
          propria: prop && typeof prop === "object" ? prop.propria : prop === true ? true : prop === false ? false : null,
          aguaData: prop && typeof prop === "object" ? prop.data : null,
          aguaOk: prop && typeof prop === "object" ? prop.ok : null,
          aguaTotal: prop && typeof prop === "object" ? prop.total : null,
          surfe: p.mar == null ? null : (() => {
            if (!m || !m.hourly) return null;
            const mh = m.hourly, g = (nome, k) => (mh[nome] ? mh[nome][k] : null);
            const res = [];
            for (let hr = HORA_INI; hr <= HORA_FIM; hr++) {
              const ts = `${data}T${pad(hr)}:00`, k = mh.time.indexOf(ts), kt = h.time.indexOf(ts);
              if (k < 0 || g("wave_height", k) == null) continue;
              res.push({ h: hr,
                alt: g("wave_height", k), dir: g("wave_direction", k), per: g("wave_period", k),
                sw: { a: g("swell_wave_height", k), d: g("swell_wave_direction", k), p: g("swell_wave_period", k) },
                sw2: { a: g("secondary_swell_wave_height", k), d: g("secondary_swell_wave_direction", k), p: g("secondary_swell_wave_period", k) },
                vg: { a: g("wind_wave_height", k), d: g("wind_wave_direction", k) },
                v: kt >= 0 ? ventoEm(kt) : null, vd: kt >= 0 && h.wind_direction_10m ? h.wind_direction_10m[kt] : null,
                raj: kt >= 0 && h.wind_gusts_10m && h.wind_gusts_10m[kt] != null ? Math.round(h.wind_gusts_10m[kt]) : null });
            }
            return res.length ? res : null;
          })(),
          marH: (() => {
            if (!m || !m.hourly) return [];
            const r = [];
            for (let hr = HORA_INI; hr <= HORA_FIM; hr++) {
              const k = m.hourly.time.indexOf(`${data}T${pad(hr)}:00`);
              if (k < 0) continue;
              let o = m.hourly.wave_height[k]; if (p.baia && o != null) o = Math.min(o, 0.5);
              r.push({ h: hr, o, s: m.hourly.sea_surface_temperature[k], d: m.hourly.wave_direction ? m.hourly.wave_direction[k] : null, per: m.hourly.wave_period ? m.hourly.wave_period[k] : null });
            }
            return r;
          })(),
          mareDia: Array.from({ length: 24 }, (_, i) => ({ h: i, n: nivelEm(data, i) })).filter((q) => q.n != null),
          mareHoras: Array.from({ length: 15 }, (_, i) => ({ h: 6 + i, n: nivelEm(data, 6 + i) })).filter((q) => q.n != null),
          mares: todasMares.filter((e) => e.data < data).slice(-1).map((e) => ({ ...e, min: e.min - 1440 })).concat(todasMares.filter((e) => e.data === data)).concat(todasMares.filter((e) => e.data > data).slice(0, 1).map((e) => ({ ...e, min: e.min + 1440 }))),
          horas: idx.map((k) => {
            const chuva = h.precipitation_probability[k] || 0;
            const nuvens = Math.round(nuvemMedia[h.time[k]] ?? (h.cloud_cover[k] || 0));
            const hr = +h.time[k].slice(11, 13);
            // hora sem sol (antes do nascer ou depois do pôr): mostra noite, a não ser que chova
            const nas = minutosDe((t.daily.sunrise[d] || "").slice(11, 16) || "05:30"), por = minutosDe((t.daily.sunset[d] || "").slice(11, 16) || "18:30");
            const escuro = hr * 60 + 30 < nas - 10 || hr * 60 + 30 > por + 10;
            const est = escuro ? (chuva >= 50 ? "chuva" : "noite") : estadoHora(chuva, nuvens);
            return { h: hr, t: Math.round(h.temperature_2m[k]), chuva, nuvens, est, uv: h.uv_index ? h.uv_index[k] : null, v: ventoEm(k),
              vd: h.wind_direction_10m ? h.wind_direction_10m[k] : null, raj: h.wind_gusts_10m && h.wind_gusts_10m[k] != null ? Math.round(h.wind_gusts_10m[k]) : null };
          })
        };
      });
    });
    previsao = out;
  }

  // ---------- dias ----------
  function ehPraiao(d) {
    const boas = PRAIAS.filter((p) => !p.baia).filter((p) => {
      const x = previsao[p.id][d], a = analisar(x, p);
      return a.horasSol >= 6 && x.vento <= 15 && x.chuvaMax < 40;
    });
    return boas.length >= 4 ? boas.length : 0;
  }
  const nomeDia = (d) => d === 0 ? "hoje" : d === 1 ? "amanhã" : SEMANA_LONGA[new Date(datas[d] + "T12:00:00").getDay()];

  function desenharDias() {
    $("#dias").innerHTML = datas.map((data, d) => {
      const dt = new Date(data + "T12:00:00");
      const nome = d === 0 ? "Hoje" : d === 1 ? "Amanhã" : SEMANA[dt.getDay()];
      const x = previsao.ipanema[d], a = analisar(x, PRAIAS.find((p) => p.id === "ipanema"));
      return `<button class="dia" data-d="${d}" aria-pressed="${d === estado.dia}">${IC[a.ceu]}<span>${nome}</span><span class="dt">${x.temp}°</span>${ehPraiao(d) ? '<i class="pr" title="Dia de praião"></i>' : ""}</button>`;
    }).join("");
    document.querySelectorAll(".dia").forEach((b) => b.onclick = () => { estado.dia = +b.dataset.d; estado.minuto = null; desenhar(); });
  }

  // ---------- mapa ----------
  let mapa, mapaPronto = false, pinos = {}, marcadorSol = null;
  const ESTILO_URL = "https://tiles.openfreemap.org/styles/liberty";

  // Estilo próprio do Praiômetro: pega o mapa do OpenFreeMap e repinta com as cores do app,
  // tirando o que polui (lojas, ônibus, placas, prédios em 3D, nomes de ruazinhas).
  const COR = { terra: "#EFE6D3", mar: "#7FCBE3", areia: "#F6DCA6", verde: "#CFE0BF", mata: "#B7D2A2", predio: "#E4D8C2",
                rua: "#FFFFFF", via: "#FFF4DA", borda: "#E2D3B8", texto: "#5A4E3C", textoMar: "#1F6F8E" };
  function estiloPraiometro(st) {
    const tirar = /^(natural_earth|poi_|road_one_way|highway-shield|road_shield|airport|building-3d|boundary_|label_country|label_state|landuse_(track|pitch|hospital|school|cemetery)|landcover_(ice|wetland)|park_outline|road_area_pattern|tunnel_|.*_rail|.*_hatching|.*path_pedestrian|highway-name-(path|minor)|waterway_line_label|aeroway_(runway|taxiway))/;
    st.layers = st.layers.filter((l) => !tirar.test(l.id));
    const pinta = (id, prop, valor) => { const l = st.layers.find((x) => x.id === id); if (l) { l.paint = l.paint || {}; l.paint[prop] = valor; } };
    st.layers.forEach((l) => {
      l.paint = l.paint || {};
      if (l.type === "line" && /casing/.test(l.id)) l.paint["line-color"] = COR.borda;
      else if (l.type === "line" && /motorway|trunk_primary/.test(l.id)) l.paint["line-color"] = COR.via;
      else if (l.type === "line" && /^(road|bridge)_/.test(l.id)) l.paint["line-color"] = COR.rua;
      if (l.type === "symbol" && /^label_/.test(l.id)) { l.paint["text-color"] = COR.texto; l.paint["text-halo-color"] = COR.terra; l.paint["text-halo-width"] = 1.5; }
      if (l.type === "symbol" && /^water_name/.test(l.id)) { l.paint["text-color"] = COR.textoMar; l.paint["text-halo-color"] = COR.mar; l.paint["text-halo-width"] = 1; }
      if (l.type === "symbol" && /^highway-name/.test(l.id)) { l.paint["text-color"] = "#9A8E7A"; l.paint["text-halo-color"] = COR.rua; }
    });
    pinta("background", "background-color", COR.terra);
    pinta("water", "fill-color", COR.mar);
    ["waterway_river", "waterway_other"].forEach((id) => pinta(id, "line-color", COR.mar));
    pinta("landcover_sand", "fill-color", COR.areia); pinta("landcover_sand", "fill-opacity", 1);
    pinta("park", "fill-color", COR.verde); pinta("park", "fill-opacity", 0.9);
    pinta("landcover_grass", "fill-color", COR.verde); pinta("landcover_grass", "fill-opacity", 0.8);
    pinta("landcover_wood", "fill-color", COR.mata); pinta("landcover_wood", "fill-opacity", 0.9);
    pinta("landuse_residential", "fill-color", "#EAE0CB");
    pinta("aeroway_fill", "fill-color", "#E6DCC8");
    pinta("building", "fill-color", COR.predio); pinta("building", "fill-opacity", 0.7);
    return st;
  }

  async function iniciarMapa() {
    let estilo = ESTILO_URL;
    try { estilo = estiloPraiometro(await buscarJSON(ESTILO_URL)); } catch (e) { console.warn("Estilo padrão do mapa", e); }
    const r = REGIOES[estado.regiao].caixa;
    mapa = new maplibregl.Map({
      container: "mapa",
      style: estilo,
      bounds: [[r[0], r[1]], [r[2], r[3]]],
      fitBoundsOptions: { padding: 30 },
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false
    });
    mapa.touchZoomRotate.disableRotation();
    mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapa.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), "top-right");
    const nomes = () => { $("#mapa").classList.toggle("mostrar-nomes", mapa.getZoom() >= 12.4); $("#mapa").classList.toggle("mostrar-postos", mapa.getZoom() >= 13.3); $("#mapa").classList.toggle("mostrar-servicos", mapa.getZoom() >= 14.2); };
    mapa.on("zoom", nomes);
    mapa.on("load", () => {
      nomes();
      const vazio = { type: "FeatureCollection", features: [] };
      mapa.addSource("sol-arco", { type: "geojson", data: vazio });
      mapa.addSource("sol-linhas", { type: "geojson", data: vazio });
      mapa.addLayer({ id: "sol-linhas", type: "line", source: "sol-linhas", layout: { "line-cap": "round" },
        paint: { "line-color": ["match", ["get", "tipo"], "nascer", "#E3B23C", "por", "#D2561E", "#10283A"],
                 "line-width": ["match", ["get", "tipo"], "agora", 2, 3], "line-dasharray": [1.5, 1.5] } });
      mapa.addLayer({ id: "sol-arco", type: "line", source: "sol-arco", layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ["case", ["get", "sombra"], "#8C9AA5", "#FFB627"], "line-width": 6, "line-opacity": 0.95 } });
      // sombra dos prédios: fica por baixo dos prédios do mapa
      mapa.addSource("sombras", { type: "geojson", data: vazio });
      mapa.addLayer({ id: "sombras", type: "fill", source: "sombras", minzoom: 13,
        paint: { "fill-color": "#1E2A3A", "fill-opacity": 0.18, "fill-antialias": false } }, mapa.getLayer("building") ? "building" : undefined);
      mapaPronto = true;
      desenharSolNoMapa();
      let espera = null;
      const refazer = () => { clearTimeout(espera); espera = setTimeout(desenharSombrasPredios, 150); };
      mapa.on("moveend", refazer);
      mapa.on("sourcedata", (e) => { if (e.sourceId === "openmaptiles" && e.isSourceLoaded) refazer(); });
    });

    // postos de guarda-vidas (aparecem quando o mapa está mais perto)
    (window.POSTOS || []).forEach(([n, lat, lon, praia]) => {
      const el = document.createElement("div");
      el.className = "posto";
      el.textContent = n;
      el.title = n === "QM" ? "Posto do Quebra-Mar" : `Posto ${n} · ${praia}`;
      new maplibregl.Marker({ element: el }).setLngLat([lon, lat]).addTo(mapa);   // no lugar exato do posto (no calçadão)
    });

    // banheiros e chuveiros (aparecem com o mapa bem perto)
    (window.SERVICOS || []).forEach(([tipo, lat, lon, pago]) => {
      const el = document.createElement("div");
      el.className = "servico " + tipo;
      el.textContent = tipo === "chuveiro" ? "🚿" : "🚻";
      el.title = (tipo === "chuveiro" ? "Chuveiro" : "Banheiro") + (pago === "yes" ? " (pago)" : pago === "no" ? " (grátis)" : "");
      new maplibregl.Marker({ element: el }).setLngLat([lon, lat]).addTo(mapa);
    });

    PRAIAS.forEach((p) => {
      const el = document.createElement("div");
      el.className = "pin";
      el.innerHTML = '<span class="ic"></span><span class="rot"></span>';
      el.querySelector(".rot").textContent = p.nome;
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-label", p.nome);
      el.addEventListener("click", (e) => { e.stopPropagation(); selecionar(p.id, true); });
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selecionar(p.id, true); } });
      const mk = new maplibregl.Marker({ element: el, anchor: "left", offset: [-18, 0] }).setLngLat([p.lon, p.lat]).addTo(mapa);
      pinos[p.id] = { el, mk };
    });
    if (linhas.length) desenhar();
  }
  function irParaRegiao(r) {
    estado.regiao = r;
    document.querySelectorAll("#regioes button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.r === r));
    const c = REGIOES[r].caixa;
    if (mapa) mapa.fitBounds([[c[0], c[1]], [c[2], c[3]]], { padding: 30, duration: 900 });
    desenharLista();
  }
  function selecionar(id, voar) {
    estado.sel = id;
    estado.minuto = null;
    const p = PRAIAS.find((x) => x.id === id);
    if (voar && mapa) mapa.flyTo({ center: [p.lon, p.lat], zoom: Math.max(mapa.getZoom(), 13.4), duration: 900 });
    desenhar();
    if (matchMedia("(max-width:900px)").matches) $("#cartao").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- relevo e sombra ----------
  async function carregarHorizonte(p) {
    if (horizontes[p.id]) return;
    const chave = "pm-horizonte-v1-" + p.id;
    const salvo = guarda.ler(chave);
    if (salvo && salvo.length === 36) { horizontes[p.id] = salvo; return; }
    horizontes[p.id] = "carregando";
    await null;
    try {
      const pts = SOL.pontosHorizonte(p);
      const partes = [];
      for (let i = 0; i < pts.length; i += 100) partes.push(pts.slice(i, i + 100));
      const res = await Promise.all(partes.map((lote) => buscarJSON("https://api.open-meteo.com/v1/elevation?latitude=" +
        lote.map((q) => q[1].toFixed(5)).join(",") + "&longitude=" + lote.map((q) => q[0].toFixed(5)).join(","))));
      const elev = [].concat(...res.map((r) => r.elevation));
      const ang = SOL.anguloHorizonte(elev);
      horizontes[p.id] = ang;
      guarda.gravar(chave, ang);
    } catch (e) {
      console.warn("Relevo indisponível", e);
      horizontes[p.id] = "erro";
    }
    if (praiaAtual().p.id === p.id) { desenharSombra(); desenharSolNoMapa(); }
  }
  const horizonteDe = (p) => Array.isArray(horizontes[p.id]) ? horizontes[p.id] : null;

  // Percorre o dia de 5 em 5 minutos e descobre quando a areia tem sol
  function sombraDoDia(p, x) {
    const hz = horizonteDe(p);
    const ini = minutosDe(x.nascer), fim = minutosDe(x.porDoSol);
    const pontos = [];
    for (let m = ini; m <= fim; m += 5) {
      const s = SOL.posicao(quando(x.data, m), p.lat, p.lon);
      pontos.push({ m, s, b: SOL.bloqueio(s, hz, p.predios) });
    }
    const comSol = pontos.filter((q) => q.b === null);
    const primeiro = comSol[0], ultimo = comSol[comSol.length - 1];
    let texto;
    const causa = (b) => b === "predios" ? "dos prédios" : "do morro";
    if (!primeiro) texto = "A areia fica na sombra quase o dia todo.";
    else {
      texto = `Sol na areia das <b>${textoMin(primeiro.m)}</b> às <b>${textoMin(ultimo.m)}</b>.`;
      if (primeiro.m > ini + 15) {
        const b = pontos.find((q) => q.b && q.b !== "noite");
        texto = `O sol só chega na areia às <b>${textoMin(primeiro.m)}</b>, por causa ${causa(b && b.b)}. ` + `Fica até as <b>${textoMin(ultimo.m)}</b>.`;
      }
      if (ultimo.m < fim - 15) {
        const depois = pontos.find((q) => q.m > ultimo.m && q.b && q.b !== "noite");
        texto += ` Depois disso, sombra ${causa(depois && depois.b)}.`;
      }
    }
    // sombra em cada hora (olhando a meia hora)
    const sombraHora = {};
    for (let h = HORA_INI; h <= HORA_FIM; h++) {
      const q = pontos.find((y) => y.m === h * 60 + 30) || pontos.find((y) => Math.abs(y.m - (h * 60 + 30)) < 5);
      sombraHora[h] = !!(q && q.b && q.b !== "noite");
    }
    return { texto, sombraHora, pontos };
  }

  function praiaAtual() {
    const ord = linhas.slice().sort((a, b) => b.a.score - a.a.score);
    return (estado.sel && linhas.find((l) => l.p.id === estado.sel)) || ord[0];
  }

  // ---------- desenho ----------
  function desenhar() {
    document.querySelectorAll(".dia").forEach((b) => b.setAttribute("aria-pressed", +b.dataset.d === estado.dia));
    linhas = PRAIAS.map((p) => { const x = previsao[p.id][estado.dia]; return { p, x, a: analisar(x, p) }; });
    const atual = praiaAtual();

    linhas.forEach(({ p, a }) => {
      const pin = pinos[p.id];
      if (!pin) return;
      const ic = pin.el.querySelector(".ic");
      ic.className = "ic " + a.ceu;
      ic.innerHTML = IC[a.ceu];
      pin.el.classList.toggle("on", p.id === atual.p.id);
    });

    const n = ehPraiao(estado.dia);
    const banner = $("#praiao");
    banner.hidden = !n;
    if (n) banner.innerHTML = `${IC.sol}<div>${nomeDia(estado.dia) === "hoje" ? "Hoje" : nomeDia(estado.dia).replace(/^./, (c) => c.toUpperCase())} é dia de praião!<small>${n} praias com solzão e vento tranquilo</small></div>`;

    carregarHorizonte(atual.p);      // usa o relevo guardado na hora, ou busca e redesenha quando chegar
    desenharCartao(atual);
    desenharLista();
    desenharSolNoMapa();
  }

  function desenharCartao(l) {
    const { p, x, a } = l;
    const ord = linhas.slice().sort((q, r) => r.a.score - q.a.score);
    const melhor = ord[0].p.id === p.id;
    const c = cena(a, x, p);
    const ini = minutosDe(x.nascer), fim = minutosDe(x.porDoSol);
    if (estado.minuto == null || estado.minuto < ini || estado.minuto > fim) {
      const agora = new Date(), mAgora = +relogio.format(agora).slice(0, 2) * 60 + +relogio.format(agora).slice(3, 5);
      estado.minuto = estado.dia === 0 && mAgora >= ini && mAgora <= fim ? mAgora - (mAgora % 5) : Math.min(Math.max(12 * 60, ini), fim);
    }
    const ultimaHora = x.horas.filter((y) => y.h >= 16 && y.h <= 18);
    const nuvensTarde = ultimaHora.length ? media(ultimaHora.map((y) => y.nuvens)) : 50;
    const porTxt = nuvensTarde >= 20 && nuvensTarde <= 60 ? "boa chance de céu colorido" : nuvensTarde < 20 ? "céu limpo, cores suaves" : "as nuvens devem esconder";
    // faixa hora a hora: horário, ícone do céu e temperatura
    const horaAgora = +relogio.format(new Date()).slice(0, 2);
    const NOME_EST = { sol: "Sol", parcial: "Entre nuvens", nublado: "Nublado", chuva: "Chuva", noite: "Sem sol" };
    const horas = [];
    for (let h = HORA_INI; h <= HORA_FIM; h++) {
      const y = x.horas.find((q) => q.h === h);
      if (!y) continue;
      const passou = estado.dia === 0 && horaAgora <= HORA_FIM && h < horaAgora; // à noite mostra o dia inteiro normal
      horas.push(`<div class="hr ${y.est}${passou ? " passou" : ""}${estado.dia === 0 && h === horaAgora ? " agora" : ""}" data-h="${h}" title="${h}h: ${NOME_EST[y.est]}">
        <span class="hh">${estado.dia === 0 && h === horaAgora ? "Agora" : h + "h"}</span>${IC[y.est]}<b>${y.t}°</b><small>${y.chuva >= 30 ? y.chuva + "%" : "&nbsp;"}</small></div>`);
    }

    // passar para o lado entre as favoritas (só quando a praia aberta é uma favorita e há 2 ou mais)
    const favs = listaFavoritas();
    const iFav = favs.findIndex((q) => q.p.id === p.id);
    let navFav = "";
    if (iFav >= 0 && favs.length > 1) {
      const ant = favs[(iFav - 1 + favs.length) % favs.length].p, prox = favs[(iFav + 1) % favs.length].p;
      navFav = `<div class="fav-nav" aria-label="Navegar entre as favoritas">
        <button class="fn-btn" data-ir="${ant.id}" aria-label="Favorita anterior: ${ant.nome}">‹<span>${ant.nome}</span></button>
        <span class="fn-meio">${IC.estrelaCheia}<b>${iFav + 1} de ${favs.length}</b><i>${favs.map((q, k) => `<em${k === iFav ? ' class="on"' : ""}></em>`).join("")}</i></span>
        <button class="fn-btn dir" data-ir="${prox.id}" aria-label="Próxima favorita: ${prox.nome}"><span>${prox.nome}</span>›</button>
      </div>`;
    }

    $("#cartao").innerHTML = `${navFav}
      <div class="cena${c.escura ? " escura" : ""}">${c.svg}
        <div class="tit">${melhor && a.tom !== "ruim" ? `<span class="badge">Melhor praia ${nomeDia(estado.dia)}</span>` : ""}<h2>${p.nome}</h2><span class="local">${p.local}</span></div>
      </div>
      <div class="horario" id="horas" role="list" aria-label="Céu hora a hora">${horas.join("")}</div>
      <div class="corpo">
        <p class="veredito">${a.veredito}</p>
        <div class="acoes">
          <button id="favoritar" aria-pressed="${ehFavorita(p.id)}">${ehFavorita(p.id) ? IC.estrelaCheia : IC.estrela}<span>${ehFavorita(p.id) ? "Favorita" : "Favoritar"}</span></button>
          <button id="compartilhar">${IC.compartilhar}<span>Compartilhar</span></button>
        </div>
        ${window.CEU && CEU.suportado() ? `<button id="verCeu" class="ver-ceu">
          <span class="vc-ic">${IC.camera}</span>
          <span class="vc-txt"><b>Veja o trajeto do sol</b><small>Aponte a câmera para o céu</small></span>
          <span class="vc-novo">NOVO</span>
        </button>` : ""}
        <div class="selos">${a.selos.map((s) => `<button class="selo ${s.cls}" data-k="${s.k}" aria-label="${s.t}. ${s.s}. Toque para ver o detalhe hora a hora">${s.ic}<b>${s.t}</b><span>${s.s}</span><i class="selo-mais" aria-hidden="true">›</i></button>`).join("")}</div>
        <div class="info sombra" id="sombra">${IC.sombra}<span>Calculando a sombra na areia…</span></div>
        ${htmlMetro(p)}
        ${graficoUv(x)}
        ${graficoMare(x)}
        <div class="info por">${IC.porDoSol}<span><b>Pôr do sol às ${x.porDoSol.replace(":", "h")}</b>, ${porTxt}${p.porDoSol ? ". Vista clássica daqui" : ""}.</span></div>
      </div>`;
    const agoraEl = document.querySelector("#horas .agora");
    if (agoraEl) $("#horas").scrollLeft = Math.max(0, agoraEl.offsetLeft - 8);
    // controle do horário do sol: fica junto do mapa (logo acima dele)
    $("#relogioMapa").innerHTML = `
        <div class="relogio">
          <label for="minuto"><span>${IC.relogio.replace("<svg", '<svg width="18" height="18" style="vertical-align:-4px;margin-right:4px"')}Onde está o sol às <b id="minutoTxt">${textoMin(estado.minuto)}</b></span><span id="minutoSit"></span></label>
          <input type="range" id="minuto" min="${ini - (ini % 5)}" max="${fim}" step="5" value="${estado.minuto}">
          <small>Arraste para ver o sol andando no mapa</small>
        </div>`;
    $("#favoritar").onclick = () => { alternarFavorita(p.id); desenharCartao(l); desenharLista(); };
    document.querySelectorAll(".fav-nav .fn-btn").forEach((b) => b.onclick = () => deslizarFavorita(b.classList.contains("dir") ? 1 : -1, 0));
    $("#compartilhar").onclick = () => compartilhar(l);
    document.querySelectorAll("#cartao .selo[data-k]").forEach((b) => b.onclick = () => abrirRelatorio(b.dataset.k, l));
    if ($("#verCeu")) $("#verCeu").onclick = () => CEU.abrir(p);
    $("#minuto").addEventListener("input", (e) => {
      estado.minuto = +e.target.value;
      $("#minutoTxt").textContent = textoMin(estado.minuto);
      atualizarSituacao();
      desenharSolNoMapa(true);
    });
    desenharSombra();
  }

  function atualizarSituacao() {
    const l = praiaAtual(), el = $("#minutoSit");
    if (!el) return;
    const s = SOL.posicao(quando(l.x.data, estado.minuto), l.p.lat, l.p.lon);
    const b = SOL.bloqueio(s, horizonteDe(l.p), l.p.predios);
    el.textContent = b === null ? "na areia" : b === "predios" ? "atrás dos prédios" : b === "morro" ? "atrás do morro" : "já se pôs";
    el.style.fontWeight = "700";
    el.style.color = b === null ? "#B26B00" : "#5A6B78";
  }

  function desenharSombra() {
    const l = praiaAtual(), el = $("#sombra");
    if (!el) return;
    const st = horizontes[l.p.id];
    if (st === "carregando" || st === undefined) { el.querySelector("span").textContent = "Calculando a sombra na areia…"; return; }
    const r = sombraDoDia(l.p, l.x);
    const temSombra = Object.values(r.sombraHora).some(Boolean);
    el.querySelector("span").innerHTML = r.texto + (temSombra ? " <small>Na faixa de horários, a listra embaixo marca a areia na sombra.</small>" : "") + (st === "erro" ? " <small>(Sem dados do relevo agora; considerei só os prédios)</small>" : "");
    document.querySelectorAll("#horas [data-h]").forEach((i) => i.classList.toggle("sombra", r.sombraHora[+i.dataset.h]));
    atualizarSituacao();
  }

  // ---------- sombra dos prédios no mapa ----------
  // Para cada prédio na tela: estica a planta dele na direção oposta ao sol, com o comprimento
  // altura / tan(altura do sol). A altura vem do mapa (OpenStreetMap); onde não tem, usa a altura
  // média dos prédios da orla daquela praia (perto dos postos) ou uma casa baixa.
  const ALTURA_ORLA = {};
  PRAIAS.forEach((p) => { if (p.predios) ALTURA_ORLA[p.id] = p.predios.altura; });
  const PRAIA_DO_POSTO = { Leme: "leme", Copacabana: "copacabana", Arpoador: "arpoador", Ipanema: "ipanema", Leblon: "leblon", Barra: "barra", "Quebra-Mar": "barra", Flamengo: "botafogo" };
  function alturaPadrao(lon, lat) {
    let melhor = null;
    (window.POSTOS || []).forEach(([, plat, plon, praia]) => {
      const id = PRAIA_DO_POSTO[praia]; if (!id || !ALTURA_ORLA[id]) return;
      const d = distKm(lat, lon, plat, plon);
      if (d < 0.32 && (!melhor || d < melhor.d)) melhor = { d, h: ALTURA_ORLA[id] };
    });
    PRAIAS.forEach((p) => { if (p.predios) { const d = distKm(lat, lon, p.lat, p.lon); if (d < 0.32 && (!melhor || d < melhor.d)) melhor = { d, h: p.predios.altura }; } });
    return melhor ? melhor.h : 6;
  }
  function casco(pts) {     // contorno convexo (envolve a planta e a planta deslocada)
    pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cruz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], hi = [];
    for (const p of pts) { while (lo.length >= 2 && cruz(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (hi.length >= 2 && cruz(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
    return lo.slice(0, -1).concat(hi.slice(0, -1));
  }
  function desenharSombrasPredios() {
    if (!mapaPronto || !linhas.length || !mapa.getSource("sombras")) return;
    const vazio = { type: "FeatureCollection", features: [] };
    if (mapa.getZoom() < 13) { mapa.getSource("sombras").setData(vazio); return; }
    const { x } = praiaAtual();
    const c = mapa.getCenter();
    const s = SOL.posicao(quando(x.data, estado.minuto ?? 12 * 60), c.lat, c.lng);
    if (s.alt <= 1) { mapa.getSource("sombras").setData(vazio); return; }
    const comp = Math.min(600, 1 / Math.tan(s.alt * Math.PI / 180));      // metros de sombra por metro de altura
    const dir = (s.az + 180) * Math.PI / 180;
    const mLat = 110540, mLon = 111320 * Math.cos(c.lat * Math.PI / 180);
    const dx = Math.sin(dir) / mLon, dy = Math.cos(dir) / mLat;           // graus por metro na direção da sombra
    let feats = [];
    try { feats = mapa.querySourceFeatures("openmaptiles", { sourceLayer: "building" }); } catch (e) { return; }
    const b = mapa.getBounds(), vistos = new Set(), saida = [];
    for (const f of feats) {
      const g = f.geometry; if (!g) continue;
      const aneis = g.type === "Polygon" ? [g.coordinates[0]] : g.type === "MultiPolygon" ? g.coordinates.map((pp) => pp[0]) : [];
      for (const anel of aneis) {
        if (!anel || anel.length < 3) continue;
        const k = anel[0][0].toFixed(6) + "," + anel[0][1].toFixed(6);
        if (vistos.has(k)) continue; vistos.add(k);
        if (!b.contains(anel[0])) continue;
        let h = +f.properties.render_height || 0;
        if (h <= 6) h = alturaPadrao(anel[0][0], anel[0][1]);
        const L = Math.min(h * comp, 600);
        if (L < 1) continue;
        const pts = anel.concat(anel.map(([lo, la]) => [lo + dx * L, la + dy * L]));
        const cont = casco(pts); cont.push(cont[0]);
        saida.push({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [cont] } });
      }
    }
    mapa.getSource("sombras").setData({ type: "FeatureCollection", features: saida });
  }

  function desenharSolNoMapa(soAgora) {
    if (!mapaPronto || !linhas.length) return;
    desenharSombrasPredios();
    const { p, x } = praiaAtual();
    const hz = horizonteDe(p);
    const ponto = (az, km) => SOL.destino(p.lat, p.lon, az, km);
    const ini = minutosDe(x.nascer), fim = minutosDe(x.porDoSol);

    if (!soAgora) {
      const feats = [];
      let atual = null;
      for (let m = ini; m <= fim; m += 10) {
        const s = SOL.posicao(quando(x.data, m), p.lat, p.lon);
        const b = SOL.bloqueio(s, hz, p.predios);
        if (b === "noite") continue;
        const sombra = b !== null;
        const c = ponto(s.az, RAIO_SOL);
        if (!atual || atual.properties.sombra !== sombra) {
          if (atual) atual.geometry.coordinates.push(c);
          atual = { type: "Feature", properties: { sombra }, geometry: { type: "LineString", coordinates: [c] } };
          feats.push(atual);
        } else atual.geometry.coordinates.push(c);
      }
      mapa.getSource("sol-arco").setData({ type: "FeatureCollection", features: feats.filter((f) => f.geometry.coordinates.length > 1) });
    }
    const sN = SOL.posicao(quando(x.data, ini), p.lat, p.lon), sP = SOL.posicao(quando(x.data, fim), p.lat, p.lon);
    const sA = SOL.posicao(quando(x.data, estado.minuto ?? 720), p.lat, p.lon);
    const linha = (tipo, az, km) => ({ type: "Feature", properties: { tipo }, geometry: { type: "LineString", coordinates: [[p.lon, p.lat], ponto(az, km)] } });
    mapa.getSource("sol-linhas").setData({ type: "FeatureCollection", features: [linha("nascer", sN.az, 1.7), linha("por", sP.az, 1.7), linha("agora", sA.az, RAIO_SOL)] });

    if (!marcadorSol) {
      const el = document.createElement("div");
      el.className = "solzinho";
      marcadorSol = new maplibregl.Marker({ element: el }).setLngLat(ponto(sA.az, RAIO_SOL)).addTo(mapa);
    }
    marcadorSol.setLngLat(ponto(sA.az, RAIO_SOL));
    marcadorSol.getElement().classList.toggle("sombra", SOL.bloqueio(sA, hz, p.predios) !== null);
  }

  // texto da mini faixa para leitores de tela
  const miniTxt = (x) => x.horas.filter((y) => y.h >= HORA_INI && y.h <= HORA_FIM).map((y) => `${y.h}h ${({ sol: "sol", parcial: "entre nuvens", nublado: "nublado", chuva: "chuva", noite: "sem sol" })[y.est]}`).join(", ");

  function desenharLista() {
    if (!linhas.length) return;
    const atual = praiaAtual();
    const ord = linhas.slice().sort((a, b) => b.a.score - a.a.score);
    const filtradas = estado.regiao === "todas" ? ord : ord.filter((l) => l.p.regiao === estado.regiao);
    const vis = filtradas.filter((l) => ehFavorita(l.p.id)).concat(filtradas.filter((l) => !ehFavorita(l.p.id)));
    $("#listaTitulo").textContent = "Praias " + nomeDia(estado.dia) + (estado.regiao === "todas" ? "" : " · " + REGIOES[estado.regiao].nome);
    $("#lista").innerHTML = vis.map((l) => `<li><button data-id="${l.p.id}" aria-current="${l.p.id === atual.p.id}">
      <span class="ic ${l.a.ceu}">${IC[l.a.ceu]}</span>
      <span class="nm"><b>${ehFavorita(l.p.id) ? '<i class="fav" aria-label="favorita">★</i> ' : ""}${l.p.nome}</b><span>${l.a.resumo}</span></span>
      <span class="mini" aria-label="${miniTxt(l.x)}">${l.x.horas.filter((y) => y.h >= HORA_INI && y.h <= HORA_FIM).map((y) => `<i class="${y.est}"></i>`).join("")}</span></button></li>`).join("");
    document.querySelectorAll("#lista button").forEach((b) => b.onclick = () => selecionar(b.dataset.id, true));
  }

  // ---------- favoritas ----------
  let favoritas = guarda.ler("pm-favoritas") || [];
  const ehFavorita = (id) => favoritas.includes(id);
  function alternarFavorita(id) {
    favoritas = ehFavorita(id) ? favoritas.filter((f) => f !== id) : favoritas.concat(id);
    guarda.gravar("pm-favoritas", favoritas);
    contarFavoritas();
  }
  function contarFavoritas() { const q = $("#favQtd"); if (q) q.textContent = favoritas.length ? favoritas.length : ""; }

  // ---------- tela das favoritas: previsão resumida de cada uma; tocando, abre a completa ----------
  // mesma ordem da tela das favoritas: da melhor nota para a pior
  function listaFavoritas() {
    return favoritas.map((id) => linhas.find((l) => l.p.id === id)).filter(Boolean).sort((a, b) => b.a.score - a.a.score);
  }
  function irFavorita(id) {
    const p = PRAIAS.find((x) => x.id === id);
    if (estado.regiao !== "todas" && estado.regiao !== p.regiao) irParaRegiao(p.regiao);
    estado.sel = id; estado.minuto = null;
    if (mapa) mapa.flyTo({ center: [p.lon, p.lat], zoom: Math.max(mapa.getZoom(), 13.4), duration: 900 });
    desenhar();
  }
  // o cartão inteiro sai pro lado e a próxima favorita entra junto, colada (como no app Tempo do iPhone)
  let deslizando = false, fantasma = null, ladoFantasma = 0;
  const GAP_FAV = 16;
  function vizinhaFav(lado) {
    const favs = listaFavoritas(), i = favs.findIndex((q) => q.p.id === estado.sel);
    if (i < 0 || favs.length < 2) return null;
    return favs[(i + lado + favs.length) % favs.length];
  }
  // prévia da praia vizinha (foto, nome e frase) que vem grudada no cartão enquanto arrasta
  function montarFantasma(lado) {
    if (fantasma && ladoFantasma === lado) return fantasma;
    tirarFantasma();
    const v = vizinhaFav(lado), c = $("#cartao");
    if (!v) return null;
    const pai = c.parentElement;
    if (getComputedStyle(pai).position === "static") pai.style.position = "relative";
    const cn = cena(v.a, v.x, v.p), nav = c.querySelector(".fav-nav");
    fantasma = document.createElement("div");
    fantasma.className = "cartao cartao-fantasma";
    fantasma.setAttribute("aria-hidden", "true");
    fantasma.style.cssText = `position:absolute;top:${c.offsetTop}px;left:${c.offsetLeft + lado * (c.offsetWidth + GAP_FAV)}px;width:${c.offsetWidth}px;height:${Math.min(c.offsetHeight, window.innerHeight * 1.5)}px;pointer-events:none`;
    fantasma.innerHTML = `${nav ? `<div class="fav-nav" style="height:${nav.offsetHeight}px"></div>` : ""}
      <div class="cena${cn.escura ? " escura" : ""}">${cn.svg}<div class="tit"><h2>${v.p.nome}</h2><span class="local">${v.p.local}</span></div></div>
      <div class="corpo"><p class="veredito">${v.a.veredito}</p>
        <div class="selos">${v.a.selos.map((x) => `<div class="selo ${x.cls}">${x.ic}<b>${x.t}</b><span>${x.s}</span></div>`).join("")}</div></div>`;
    pai.appendChild(fantasma);
    ladoFantasma = lado;
    return fantasma;
  }
  function tirarFantasma() { if (fantasma) fantasma.remove(); fantasma = null; ladoFantasma = 0; }
  function moverJuntos(dx, trans) {
    const c = $("#cartao");
    c.style.transition = trans || "none"; c.style.transform = dx ? `translateX(${dx}px)` : "";
    if (fantasma) { fantasma.style.transition = trans || "none"; fantasma.style.transform = dx ? `translateX(${dx}px)` : ""; }
  }
  function deslizarFavorita(lado, dxAtual) {
    if (deslizando) return;
    const v = vizinhaFav(lado);
    if (!v) return;
    deslizando = true;
    const c = $("#cartao"), W = c.offsetWidth + GAP_FAV;
    montarFantasma(lado);
    const resto = 1 - Math.min(1, Math.abs(dxAtual) / W), ms = Math.round(160 + 200 * resto);
    if (!dxAtual) moverJuntos(0);
    void c.offsetWidth;
    moverJuntos(-lado * W, `transform ${ms}ms cubic-bezier(.25,.8,.3,1)`);
    setTimeout(() => {
      irFavorita(v.p.id);
      moverJuntos(0);
      tirarFantasma();
      setTimeout(() => { c.style.transition = ""; deslizando = false; }, 30);
    }, ms + 10);
  }
  // arrastar o dedo em qualquer parte do cartão: ele acompanha o dedo; soltando depois de 1/4 da tela (ou rápido), troca
  function ligarArrasteCartao() {
    const c = $("#cartao");
    if (!c || c.dataset.arraste) return;
    c.dataset.arraste = "1";
    let x0 = 0, y0 = 0, t0 = 0, modo = null, dx = 0, ativo = false;
    c.addEventListener("touchstart", (e) => {
      ativo = false; modo = null; dx = 0;
      if (deslizando || e.touches.length > 1) return;
      if (e.target.closest("#horas, input, .tab-surf, .mare-g")) return;   // essas partes rolam para o lado sozinhas
      const favs = listaFavoritas();
      if (favs.length < 2 || !favs.some((q) => q.p.id === estado.sel)) return;
      ativo = true; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now();
    }, { passive: true });
    c.addEventListener("touchmove", (e) => {
      if (!ativo) return;
      const ddx = e.touches[0].clientX - x0, ddy = e.touches[0].clientY - y0;
      if (!modo && (Math.abs(ddx) > 8 || Math.abs(ddy) > 8)) modo = Math.abs(ddx) > Math.abs(ddy) ? "h" : "v";
      if (modo !== "h") return;
      e.preventDefault();
      dx = ddx;
      const temViz = montarFantasma(dx < 0 ? 1 : -1);
      moverJuntos(temViz ? dx : dx * 0.3);
    }, { passive: false });
    const fim = () => {
      if (!ativo || modo !== "h") { ativo = false; return; }
      ativo = false;
      const W = c.offsetWidth, vel = Math.abs(dx) / Math.max(1, Date.now() - t0);
      if (Math.abs(dx) > W * 0.25 || (vel > 0.5 && Math.abs(dx) > 30)) deslizarFavorita(dx < 0 ? 1 : -1, dx);
      else { moverJuntos(0, "transform 250ms cubic-bezier(.2,.8,.2,1)"); setTimeout(() => { c.style.transition = ""; tirarFantasma(); }, 260); }
    };
    c.addEventListener("touchend", fim);
    c.addEventListener("touchcancel", fim);
  }
  function desenharFavoritas() {
    const dia = nomeDia(estado.dia);
    $("#favDia").textContent = `Previsão de ${dia}`;
    const minhas = listaFavoritas();
    if (!minhas.length) {
      $("#favLista").innerHTML = `<div class="fav-vazio">${IC.estrela}<b>Nenhuma praia favorita ainda</b>
        <span>Abra uma praia e toque em <b>Favoritar</b>. Ela aparece aqui, com a previsão resumida, sempre que você abrir.</span></div>`;
      return;
    }
    $("#favLista").innerHTML = minhas.map(({ p, a }) => `<button class="fav-card simples" data-id="${p.id}">
        <span class="ic ${a.ceu}">${IC[a.ceu]}</span>
        <span class="fav-nome"><b>${p.nome}</b></span>
        <span class="fav-abrir">Previsão completa ›</span>
      </button>`).join("");
    document.querySelectorAll(".fav-card").forEach((b) => b.onclick = () => { fecharFavoritas(); abrirPraia(b.dataset.id); });
  }
  function abrirFavoritas() { desenharFavoritas(); $("#favTela").hidden = false; document.body.style.overflow = "hidden"; }
  function fecharFavoritas() { $("#favTela").hidden = true; document.body.style.overflow = ""; }

  // ---------- surfe: só dados técnicos (swell, período, direção, vento, maré) ----------
  const PONTOS = ["N", "NNE", "NE", "ENE", "L", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
  const rumo = (g) => g == null ? "" : PONTOS[Math.round(((g % 360) + 360) % 360 / 22.5) % 16];
  const difAng = (a, b) => { const d = Math.abs((((a - b) % 360) + 360) % 360); return d > 180 ? 360 - d : d; };
  // terral / lateral / maral pela direção do vento em relação à orientação da praia
  function tipoVento(v, vd, praia) {
    if (v == null || vd == null) return { tipo: "–", cls: "neutro" };
    const c = Math.cos(difAng(vd, praia) * Math.PI / 180);
    if (c <= -0.5) return { tipo: "Terral", cls: "terral" };
    if (c >= 0.5) return { tipo: "Maral", cls: "maral" };
    return { tipo: "Lateral", cls: "lateral" };
  }
  const fmt1 = (n) => n == null ? "–" : String(Math.round(n * 10) / 10).replace(".", ",");
  const int = (n) => n == null ? "–" : Math.round(n);
  const seta = (g, cor) => g == null ? "" : `<svg class="seta" viewBox="0 0 24 24" style="transform:rotate(${(g + 180) % 360}deg)" aria-hidden="true"><path d="M12 3l6 9h-4v9h-4v-9H6z" fill="${cor || "currentColor"}"/></svg>`;
  const swP = (q) => (q.sw && q.sw.a != null ? q.sw : { a: q.alt, p: q.per, d: q.dir });
  const PICOS = () => PRAIAS.filter((p) => p.mar != null);
  let surfeDia = 0, surfeAberta = null, surfeModo = "lista", surfeHora = null;
  // ---------- mapa do mar: a previsão de todos os picos no mapa, com régua de horário ----------
  let mapaSurfe = null, mapaSurfePronto = false, marcasSurfe = [];
  const PRIORIDADE_SURFE = ["arpoador", "leblon", "ipanema", "copacabana", "saoconrado", "barra", "joatinga", "recreio", "prainha", "grumari", "reserva", "leme", "vidigal", "diabo", "itacoatiara", "itaipu", "piratininga"];
  // ponto no mar, 1,3 km em frente à praia (na direção para onde ela está virada)
  const noMar = (p, km = 1.3) => { const r = p.mar * Math.PI / 180; return [p.lon + Math.sin(r) * km / (111.32 * Math.cos(p.lat * Math.PI / 180)), p.lat + Math.cos(r) * km / 110.57]; };
  const AREAS_SURFE = [
    { id: "zs", nome: "Zona Sul", caixa: [-43.29, -23.02, -43.155, -22.955] },
    { id: "barra", nome: "Barra e Recreio", caixa: [-43.49, -23.06, -43.27, -22.99] },
    { id: "grumari", nome: "Prainha e Grumari", caixa: [-43.55, -23.07, -43.45, -23.02] },
    { id: "nit", nome: "Niterói", caixa: [-43.11, -23.0, -43.0, -22.94] },
    { id: "tudo", nome: "Tudo", caixa: [-43.56, -23.09, -43.0, -22.93] }];
  let areaSurfe = "zs";
  async function desenharSurfeMapa() {
    $("#surfeAreas").innerHTML = AREAS_SURFE.map((a) => `<button data-a="${a.id}" aria-pressed="${a.id === areaSurfe}">${a.nome}</button>`).join("");
    document.querySelectorAll("#surfeAreas button").forEach((b) => b.onclick = () => {
      areaSurfe = b.dataset.a; const c = AREAS_SURFE.find((a) => a.id === areaSurfe).caixa;
      document.querySelectorAll("#surfeAreas button").forEach((o) => o.setAttribute("aria-pressed", o === b));
      if (mapaSurfe) mapaSurfe.fitBounds([[c[0], c[1]], [c[2], c[3]]], { padding: 16, duration: 800 });
    });
    if (surfeHora == null) surfeHora = horaLista();
    $("#surfeHoraBox").innerHTML = `<label for="surfeHoraR"><span>Previsão às <b>${surfeHora}h</b></span>${surfeDia === 0 && surfeHora !== horaLista() ? '<button id="surfeAgora">Agora</button>' : ""}</label>
      <input type="range" id="surfeHoraR" min="${HORA_INI}" max="${HORA_FIM}" step="1" value="${surfeHora}">`;
    $("#surfeHoraR").oninput = (e) => { surfeHora = +e.target.value; $("#surfeHoraBox b").textContent = surfeHora + "h"; colocarSurfe(); };
    $("#surfeHoraR").onchange = () => desenharSurfeMapa();
    if ($("#surfeAgora")) $("#surfeAgora").onclick = () => { surfeHora = horaLista(); desenharSurfeMapa(); };
    if (mapaSurfe) { mapaSurfe.resize(); if (mapaSurfePronto) colocarSurfe(); return; }
    if (!window.maplibregl) return;
    let estilo = ESTILO_URL;
    try { estilo = estiloPraiometro(await buscarJSON(ESTILO_URL)); } catch (e) { console.warn("Estilo padrão do mapa", e); }
    mapaSurfe = new maplibregl.Map({ container: "surfeMapa", style: estilo, bounds: (() => { const c = AREAS_SURFE.find((a) => a.id === areaSurfe).caixa; return [[c[0], c[1]], [c[2], c[3]]]; })(), fitBoundsOptions: { padding: 16 },
      attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false });
    mapaSurfe.touchZoomRotate.disableRotation();
    mapaSurfe.on("load", () => { mapaSurfePronto = true; colocarSurfe(); });
    mapaSurfe.on("move", arrumarSurfe);
  }
  function colocarSurfe() {
    if (!mapaSurfe) return;
    marcasSurfe.forEach((m) => m.mk.remove()); marcasSurfe = [];
    PICOS().forEach((p) => {
      const x = previsao[p.id][surfeDia], q = x.surfe && x.surfe.find((y) => y.h === surfeHora);
      if (!q) return;
      const s = swP(q), tv = tipoVento(q.v, q.vd, p.mar);
      const el = document.createElement("button");
      el.className = "smk v-" + tv.cls;
      el.setAttribute("aria-label", `${p.nome}: ondas ${fmt1(s.a)} m, ${int(s.p)} s, ${rumo(s.d)}; vento ${rumo(q.vd)} ${int(q.v)} km/h, ${tv.tipo}`);
      el.innerHTML = `<span class="smk-n">${p.nome}</span>
        <span class="smk-o">${seta(s.d)}<b>${fmt1(s.a)}</b><small>m</small><em>${int(s.p)}s</em></span>
        <span class="smk-v ${tv.cls}">${seta(q.vd)}${int(q.v)}</span>`;
      el.onclick = (ev) => { ev.stopPropagation(); surfeAberta = p.id; desenharSurfe(); $("#surfeTela").scrollTop = 0; };
      const mk = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(noMar(p)).addTo(mapaSurfe);
      marcasSurfe.push({ id: p.id, mk, el, ll: noMar(p) });
    });
    arrumarSurfe();
  }
  // quando os balões se encostam, esconde os menos importantes (aparecem ao dar zoom)
  function arrumarSurfe() {
    if (!mapaSurfe || !marcasSurfe.length) return;
    const z = mapaSurfe.getZoom(), compacto = z < 10.2;
    const L = compacto ? 58 : 82, A = compacto ? 30 : 58;
    const ord = marcasSurfe.slice().sort((a, b) => PRIORIDADE_SURFE.indexOf(a.id) - PRIORIDADE_SURFE.indexOf(b.id));
    const mostrados = [];
    ord.forEach((m) => {
      const pt = mapaSurfe.project(m.ll);
      const bate = mostrados.some((o) => Math.abs(o.x - pt.x) < L && Math.abs(o.y - pt.y) < A);
      m.el.classList.toggle("compacto", compacto);
      m.el.style.visibility = bate ? "hidden" : "visible";
      if (!bate) mostrados.push(pt);
    });
  }
  // hora mostrada na lista: hoje, a hora atual; outros dias, 8h
  const horaLista = () => surfeDia === 0 ? Math.min(HORA_FIM, Math.max(HORA_INI, +relogio.format(new Date()).slice(0, 2))) : 8;
  function desenharSurfe() {
    const nomes = datas.map((dt, d) => d === 0 ? "Hoje" : d === 1 ? "Amanhã" : SEMANA[new Date(dt + "T12:00:00").getDay()]);
    $("#surfeDias").innerHTML = nomes.map((n, d) => `<button data-d="${d}" aria-pressed="${d === surfeDia}">${n}</button>`).join("");
    document.querySelectorAll("#surfeDias button").forEach((b) => b.onclick = () => { surfeDia = +b.dataset.d; ondT = null; desenharSurfe(); });
    if (surfeAberta) { $("#surfeModo").hidden = true; $("#surfeMapaBox").hidden = true; $("#ondBox").hidden = true; pararOnd(); $("#surfeLista").hidden = false; return desenharPico(surfeAberta); }
    $("#surfeTitulo").textContent = "Surfe";
    $("#surfeVoltar").hidden = true;
    $("#surfeModo").hidden = false;
    document.querySelectorAll("#surfeModo button").forEach((b) => { b.setAttribute("aria-pressed", b.dataset.m === surfeModo); b.onclick = () => { surfeModo = b.dataset.m; desenharSurfe(); }; });
    if (surfeModo !== "ond") pararOnd();
    $("#ondBox").hidden = surfeModo !== "ond";
    if (surfeModo === "ond") { $("#surfeLista").hidden = true; $("#surfeMapaBox").hidden = true; desenharOnd(); return; }
    if (surfeModo === "mapa") { $("#surfeLista").hidden = true; $("#surfeMapaBox").hidden = false; desenharSurfeMapa(); return; }
    $("#surfeLista").hidden = false; $("#surfeMapaBox").hidden = true;
    const hL = horaLista();
    const lista = PICOS().map((p) => { const x = previsao[p.id][surfeDia]; return { p, q: x.surfe && x.surfe.find((y) => y.h === hL) }; }).filter((r) => r.q);
    if (!lista.length) { $("#surfeLista").innerHTML = `<div class="fav-vazio"><b>Sem previsão de ondas agora</b><span>Tente de novo daqui a pouco.</span></div>`; return; }
    $("#surfeLista").innerHTML = `<p class="surf-hora">${surfeDia === 0 ? "Agora (" + hL + "h)" : "Às " + hL + "h"} · toque no pico para ver hora a hora</p>` + lista.map(({ p, q }) => {
      const s = swP(q), s2 = q.sw2, tv = tipoVento(q.v, q.vd, p.mar);
      return `<button class="surf-card" data-id="${p.id}">
        <span class="sc-meio"><b>${p.nome}</b>
          <span class="sc-l">${seta(s.d)}<b>${fmt1(s.a)} m</b> · ${int(s.p)} s · ${rumo(s.d)}</span>
          <span class="sc-l">${seta(q.vd)}${rumo(q.vd)} ${int(q.v)} km/h · <i class="vt ${tv.cls}">${tv.tipo}</i></span>
        </span>
        <span class="fav-abrir">›</span>
      </button>`;
    }).join("");
    document.querySelectorAll(".surf-card").forEach((b) => b.onclick = () => { surfeAberta = b.dataset.id; desenharSurfe(); $("#surfeTela").scrollTop = 0; });
  }
  // maré do dia inteiro: curva suave, altas e baixas com hora e nível, noite sombreada e o "agora"
  function graficoMareSurfe(x) {
    const pts = x.mareDia || [];
    if (pts.length < 12) return "";
    const W = 340, H = 190, esq = 30, dir = 8, topo = 26, base = 150;
    const ext = (x.mares || []).filter((e) => e.min >= 0 && e.min < 1440 && e.nivel != null);
    const ns = pts.map((q) => q.n).concat(ext.map((e) => e.nivel));
    let lo = Math.min(...ns), hi = Math.max(...ns);
    const amp0 = hi - lo || 0.3; lo -= amp0 * 0.42; hi += amp0 * 0.22;
    const passo = hi - lo > 1.2 ? 0.4 : 0.2;
    const X = (min) => esq + (W - esq - dir) * min / 1440, Y = (n) => base - (base - topo) * (n - lo) / (hi - lo);
    const P = pts.map((q) => [X(q.h * 60), Y(q.n)]);
    // curva suave (Catmull-Rom)
    let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
      d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    const area = d + ` L${P[P.length - 1][0].toFixed(1)},${base} L${P[0][0].toFixed(1)},${base} Z`;
    const nas = minutosDe(x.nascer), por = minutosDe(x.porDoSol);
    let grade = "";
    for (let v = Math.ceil(lo / passo) * passo; v <= hi; v += passo) {
      const y = Y(v).toFixed(1);
      grade += `<line x1="${esq}" x2="${W - dir}" y1="${y}" y2="${y}" stroke="#E3EAF0" ${Math.abs(v) < 1e-6 ? 'stroke-dasharray="3 3" stroke="#B9C7D2"' : ""}/><text x="${esq - 4}" y="${+y + 3}" text-anchor="end" font-size="9" fill="#5A6B78">${fmt1(v)}</text>`;
    }
    let eixo = "";
    for (let h = 0; h <= 24; h += 3) eixo += `<text x="${X(h * 60)}" y="${base + 14}" text-anchor="middle" font-size="9" fill="#5A6B78">${h}h</text><line x1="${X(h * 60)}" x2="${X(h * 60)}" y1="${base}" y2="${base + 4}" stroke="#B9C7D2"/>`;
    const hhmm = (m) => `${Math.floor(m / 60)}h${pad(m % 60)}`;
    const marcas = ext.map((e) => {
      const cx = X(e.min), cy = Y(e.nivel), alta = e.tipo === "alta";
      const ty = alta ? cy - 16 : cy + 18, anc = cx < esq + 30 ? "start" : cx > W - 34 ? "end" : "middle";
      return `<circle cx="${cx}" cy="${cy}" r="4" fill="${alta ? "#0B6FA8" : "#fff"}" stroke="#0B6FA8" stroke-width="2"/>
        <text x="${cx}" y="${ty}" text-anchor="${anc}" font-size="10" font-weight="800" fill="#10283A">${hhmm(e.min)}</text>
        <text x="${cx}" y="${ty + 10}" text-anchor="${anc}" font-size="9" fill="#5A6B78">${fmt1(e.nivel)} m</text>`;
    }).join("");
    // linha amarela: começa no agora (outros dias: mesma hora de agora) e pode ser arrastada
    const tA = new Date(), mAgora = +relogio.format(tA).slice(0, 2) * 60 + +relogio.format(tA).slice(3, 5);
    const minIni = pts[0].h * 60, minFim = pts[pts.length - 1].h * 60;
    const nivelMin = (m) => { const k = Math.floor(m / 60), a0 = pts.find((q) => q.h === k), a1 = pts.find((q) => q.h === k + 1); return a0 ? (a1 ? a0.n + (a1.n - a0.n) * (m % 60) / 60 : a0.n) : null; };
    mareCursor = { X, Y, esq, dir, W, minIni, minFim, nivelMin, ext, hhmm, agora: surfeDia === 0 ? mAgora : null, topo, base };
    const m0 = Math.min(minFim, Math.max(minIni, mAgora));
    const agora = `<g id="mCursor" style="pointer-events:none"><line id="mcL" x1="0" x2="0" y1="${topo - 12}" y2="${base}" stroke="#E8A400" stroke-width="2" stroke-dasharray="4 3"/>
        <circle id="mcP" cx="0" cy="0" r="5.5" fill="#E8A400" stroke="#fff" stroke-width="2"/>
        <rect id="mcA" x="-9" y="${base - 7}" width="18" height="14" rx="7" fill="#E8A400"/><path id="mcS" d="M-4 ${base} l-2.5 0 m9 0 l-2.5 0 M-4.5 ${base - 3} l-3 3 l3 3 M4.5 ${base - 3} l3 3 l-3 3" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>`;
    const estadoTxt = `<p class="mare-agora" id="mcTxt"></p>`;
    setTimeout(() => moverCursorMare(m0), 0);
    return `<div class="mare-surf">${estadoTxt}
      <svg viewBox="0 0 ${W} ${H - 22}" role="img" aria-label="Maré do dia, arraste a linha amarela" id="mareSvg">
        <defs><linearGradient id="gMare" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4FB3D9" stop-opacity=".55"/><stop offset="1" stop-color="#4FB3D9" stop-opacity=".08"/></linearGradient></defs>
        <rect x="${X(0)}" y="${topo - 14}" width="${Math.max(0, X(nas) - X(0))}" height="${base - topo + 14}" fill="#EEF1F6"/>
        <rect x="${X(por)}" y="${topo - 14}" width="${Math.max(0, X(1440) - X(por))}" height="${base - topo + 14}" fill="#EEF1F6"/>
        ${grade}
        <path d="${area}" fill="url(#gMare)"/>
        <path d="${d}" fill="none" stroke="#0B6FA8" stroke-width="2.2"/>
        ${eixo}${agora}${marcas}
      </svg>
      <div class="pico-leg"><span><i style="background:#0B6FA8"></i>Alta</span><span><i style="background:#fff;border:2px solid #0B6FA8;box-sizing:border-box"></i>Baixa</span><span><i style="background:#EEF1F6"></i>Noite</span><small>Arraste a linha amarela para ver outro horário</small></div>
    </div>`;
  }
  let mareCursor = null;
  function moverCursorMare(m) {
    const c = mareCursor, svg = $("#mareSvg");
    if (!c || !svg) return;
    m = Math.round(Math.min(c.minFim, Math.max(c.minIni, m)) / 5) * 5;
    const n = c.nivelMin(m), cx = c.X(m), cy = c.Y(n);
    $("#mcL").setAttribute("x1", cx); $("#mcL").setAttribute("x2", cx);
    $("#mcP").setAttribute("cx", cx); $("#mcP").setAttribute("cy", cy);
    $("#mcA").setAttribute("x", cx - 9); $("#mcS").setAttribute("transform", `translate(${cx} 0)`);
    const prox = c.ext.find((e) => e.min > m);
    const ehAgora = c.agora != null && Math.abs(m - c.agora) < 5;
    $("#mcTxt").innerHTML = `<b>${ehAgora ? "Agora" : c.hhmm(m)} · ${fmt1(n)} m</b>${prox ? ` · ${prox.tipo === "alta" ? "enchendo até " : "secando até "}${c.hhmm(prox.min)}` : ""}${c.agora != null && !ehAgora ? ' <button id="mcVolta">Voltar pro agora</button>' : ""}`;
    if ($("#mcVolta")) $("#mcVolta").onclick = () => moverCursorMare(c.agora);
    // destaca a coluna da mesma hora na tabela
    const h = Math.floor(m / 60);
    document.querySelectorAll(".tab-surf td.cur, .tab-surf th.cur").forEach((e) => e.classList.remove("cur"));
    document.querySelectorAll(`.tab-surf [data-h="${h}"]`).forEach((e) => e.classList.add("cur"));
    const td = document.querySelector(`.tab-surf td[data-h="${h}"]`), tab = $(".tab-surf");
    if (td && tab) { const l = td.offsetLeft, vis = tab.scrollLeft + 110, fim = tab.scrollLeft + tab.clientWidth - td.offsetWidth;
      if (l < vis || l > fim) tab.scrollLeft = Math.max(0, l - tab.clientWidth / 2); }
  }
  function ligarCursorMare() {
    const svg = $("#mareSvg");
    if (!svg || !mareCursor) return;
    const c = mareCursor;
    const paraMin = (ev) => { const r = svg.getBoundingClientRect(), vx = (ev.clientX - r.left) * c.W / r.width; return (vx - c.esq) / (c.W - c.esq - c.dir) * 1440; };
    let arrastando = false;
    svg.addEventListener("pointerdown", (ev) => { arrastando = true; svg.setPointerCapture(ev.pointerId); moverCursorMare(paraMin(ev)); });
    svg.addEventListener("pointermove", (ev) => { if (arrastando) moverCursorMare(paraMin(ev)); });
    const solta = () => { arrastando = false; };
    svg.addEventListener("pointerup", solta); svg.addEventListener("pointercancel", solta);
  }
  function desenharPico(id) {
    const p = PRAIAS.find((q) => q.id === id), x = previsao[id][surfeDia], hs = x.surfe;
    $("#surfeTitulo").textContent = p.nome;
    $("#surfeVoltar").hidden = false;
    if (!hs) { $("#surfeLista").innerHTML = `<div class="fav-vazio"><b>Sem previsão de ondas pra este dia</b></div>`; return; }
    const agoraH = surfeDia === 0 ? +relogio.format(new Date()).slice(0, 2) : -1;
    const nas = minutosDe(x.nascer), por = minutosDe(x.porDoSol);
    const escuro = (h) => h * 60 + 30 < nas - 10 || h * 60 + 30 > por + 10;
    const col = (q, html) => `<td data-h="${q.h}" class="${q.h === agoraH ? "ag" : ""}${escuro(q.h) ? " esc" : ""}">${html}</td>`;
    const linha = (rotulo, f, cls) => `<tr${cls ? ` class="${cls}"` : ""}><th>${rotulo}</th>${hs.map((q) => col(q, f(q))).join("")}</tr>`;
    const nivel = Object.fromEntries((x.mareDia || x.mareHoras || []).map((m) => [m.h, m.n]));
    const maxA = Math.max(1, ...hs.map((q) => swP(q).a || 0));
    // cor das ondas pelo tamanho e do período pela força
    const corOnda = (a) => a < 0.5 ? "#9CC9DD" : a < 1 ? "#4FB3D9" : a < 1.5 ? "#1E8FC6" : a < 2.2 ? "#0B6FA8" : "#3E2C93";
    const clsPer = (p) => p == null ? "" : p >= 12 ? "p3" : p >= 9 ? "p2" : p >= 7 ? "p1" : "p0";
    const tabela = `<div class="tab-surf"><table>
      <tr class="linha-h"><th></th>${hs.map((q) => col(q, `<b>${q.h === agoraH ? "Agora" : q.h + "h"}</b>`)).join("")}</tr>
      ${linha('Ondas <small>m</small>', (q) => { const a = swP(q).a; return a == null ? "–" : `<div class="ond"><b>${fmt1(a)}</b><i style="height:${Math.max(4, 36 * a / maxA)}px;background:${corOnda(a)}"></i></div>`; }, "l-ond")}
      ${linha('Período <small>s</small>', (q) => { const p = swP(q).p; return `<span class="per ${clsPer(p)}">${int(p)}</span>`; })}
      ${linha("Direção", (q) => `<span class="dirw">${seta(swP(q).d)}</span><small>${rumo(swP(q).d)}</small>`)}
      ${linha('Vento <small>km/h</small>', (q) => { const tv = tipoVento(q.v, q.vd, p.mar); return `<span class="vpill ${tv.cls}">${seta(q.vd)}<b>${int(q.v)}</b></span><small>${rumo(q.vd)}</small>`; }, "l-vento")}
      ${Object.keys(nivel).length ? linha('Maré <small>m</small>', (q) => { const n = nivel[q.h], n2 = nivel[q.h + 1]; if (n == null) return "–"; const sob = n2 == null ? null : n2 > n; return `<span class="mar-c">${sob == null ? "" : sob ? "↑" : "↓"}${fmt1(n)}</span>`; }) : ""}
    </table></div>`;
    const mares = (x.mares || []).filter((e) => e.min >= 0 && e.min < 1440).map((e) => `<span><b>${e.tipo === "alta" ? "Alta" : "Baixa"}</b> ${Math.floor(e.min / 60)}h${pad(e.min % 60)}</span>`).join("");
    $("#surfeLista").innerHTML = `<div class="pico">
      ${tabela}
      <div class="pico-leg"><span><i class="terral"></i>Terral</span><span><i class="lateral"></i>Lateral</span><span><i class="maral"></i>Maral</span><span><i style="background:#0B6FA8"></i>Período longo</span></div>
      ${mares || x.mareDia ? `<h3>Maré</h3>${graficoMareSurfe(x) || `<p class="pico-mare">${mares}</p>`}` : ""}
      ${x.agua != null ? `<p class="pico-dados"><span>Água <b>${fmt1(x.agua)} °C</b></span></p>` : ""}
      <button class="pico-abrir" data-id="${p.id}">Ver previsão completa da praia ›</button>
    </div>`;
    $(".pico-abrir").onclick = () => { fecharSurfe(); estado.dia = surfeDia; abrirPraia(p.id); };
    ligarCursorMare();
    const ag = document.querySelector(".tab-surf td.ag");
    if (ag) $(".tab-surf").scrollLeft = Math.max(0, ag.offsetLeft - 120);
  }
  function abrirSurfe() { surfeDia = estado.dia; surfeAberta = null; surfeHora = null; desenharSurfe(); $("#surfeTela").hidden = false; document.body.style.overflow = "hidden"; }
  function fecharSurfe() { pararOnd(); $("#surfeTela").hidden = true; document.body.style.overflow = ""; }

  // ---------- mapa de ondulação (estilo Windguru): cores da altura, linhas de contorno, setas e régua de tempo ----------
  const GRADES_OND = {
    atl: { nome: "Atlântico Sul", lat0: -52, lat1: -16, lon0: -60, lon1: -22, passo: 2, sobe: 6, caixa: [-57, -47, -27, -19], linhaGrade: 5, zMax: 9 },
    costa: { nome: "Costa do Rio", lat0: -26.5, lat1: -22, lon0: -46, lon1: -40.5, passo: 0.5, sobe: 4, caixa: [-45.2, -25.5, -41.2, -22.4], linhaGrade: 1, zMax: 16 } };
  // limite do mapa = área que tem dado de ondulação; assim não dá para afastar até aparecer mar sem cor
  const limitesOnd = (gid) => { const g = GRADES_OND[gid]; return [[g.lon0, g.lat0], [g.lon1, g.lat1]]; };
  function travarOnd() { if (!mapaOnd) return; mapaOnd.setMaxBounds(limitesOnd(gradeOnd)); mapaOnd.setMaxZoom(GRADES_OND[gradeOnd].zMax); }
  Object.values(GRADES_OND).forEach((g) => { g.lin = Math.round((g.lat1 - g.lat0) / g.passo) + 1; g.col = Math.round((g.lon1 - g.lon0) / g.passo) + 1; });
  const RAMPA_OND = [[0, [150, 200, 255]], [0.5, [110, 200, 240]], [1, [90, 215, 180]], [1.5, [120, 220, 90]], [2, [200, 235, 70]], [2.5, [250, 230, 60]],
    [3, [250, 185, 50]], [4, [240, 120, 40]], [5, [220, 50, 40]], [6, [170, 20, 40]], [7, [220, 40, 160]], [9, [255, 170, 255]]];
  const NIVEIS_OND = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8];
  const corOnd = (v) => {
    if (v <= RAMPA_OND[0][0]) return RAMPA_OND[0][1];
    for (let i = 1; i < RAMPA_OND.length; i++) if (v <= RAMPA_OND[i][0]) { const [a, ca] = RAMPA_OND[i - 1], [b, cb] = RAMPA_OND[i], f = (v - a) / (b - a); return ca.map((c, j) => Math.round(c + (cb[j] - c) * f)); }
    return RAMPA_OND[RAMPA_OND.length - 1][1];
  };
  const dadosOnd = {};
  let gradeOnd = "atl", mapaOnd = null, ondPronto = false, ondT = null, ondPlay = null, ondDesenhoPend = false, campoCache = null;
  const ondVelho = {};
  async function carregarOnd(gid, forcar) {
    const g = GRADES_OND[gid], chave = "pm-ondulacao-v2-" + gid, c = guarda.ler(chave);
    if (!forcar && c && Date.now() - c.t < CACHE_MIN * 60000) return c;
    const lats = [], lons = [];
    for (let i = 0; i < g.lin; i++) for (let j = 0; j < g.col; j++) { lats.push((g.lat1 - i * g.passo).toFixed(2)); lons.push((g.lon0 + j * g.passo).toFixed(2)); }
    const partes = [];
    for (let k = 0; k < lats.length; k += 130) partes.push(buscarJSON("https://marine-api.open-meteo.com/v1/marine?latitude=" + lats.slice(k, k + 130).join(",") + "&longitude=" + lons.slice(k, k + 130).join(",") +
      "&hourly=wave_height,wave_direction,wave_period&temporal_resolution=hourly_3&timezone=" + encodeURIComponent(FUSO) + "&forecast_days=7"));
    const arr = (await Promise.all(partes)).flatMap((r) => (Array.isArray(r) ? r : [r]));
    const arred = (v, f) => (v == null ? null : Math.round(v * f) / f);
    const novo = { t: Date.now(), time: arr[0].hourly.time,
      a: arr.map((q) => q.hourly.wave_height.map((v) => arred(v, 10))),
      d: arr.map((q) => q.hourly.wave_direction.map((v) => arred(v, 1))),
      p: arr.map((q) => q.hourly.wave_period.map((v) => arred(v, 1))) };
    try { guarda.gravar(chave, novo); } catch (e) { /* sem espaço: segue sem guardar */ }
    return novo;
  }
  const nomeOndT = (D, ti) => { const ts = D.time[ti], d = datas.indexOf(ts.slice(0, 10));
    return `${d === 0 ? "Hoje" : d === 1 ? "Amanhã" : SEMANA[new Date(ts.slice(0, 10) + "T12:00:00").getDay()]} ${+ts.slice(11, 13)}h`; };
  async function desenharOnd() {
    $("#ondAreas").innerHTML = Object.entries(GRADES_OND).map(([id, g]) => `<button data-g="${id}" aria-pressed="${id === gradeOnd}">${g.nome}</button>`).join("");
    document.querySelectorAll("#ondAreas button").forEach((b) => b.onclick = () => {
      if (gradeOnd === b.dataset.g) return;
      gradeOnd = b.dataset.g; campoCache = null; micro = null;
      const c = GRADES_OND[gradeOnd].caixa;
      if (mapaOnd) {
        // solta o limite, voa até a área nova e só então trava de novo (para a animação não dar pulo)
        mapaOnd.setMaxBounds(null); mapaOnd.setMaxZoom(16);
        mapaOnd.fitBounds([[c[0], c[1]], [c[2], c[3]]], { padding: 4, duration: 900 });
        const gid = gradeOnd;
        mapaOnd.once("moveend", () => { if (gid === gradeOnd) travarOnd(); });
      }
      desenharOnd();
    });
    if (!dadosOnd[gradeOnd]) {
      $("#ondHora").innerHTML = `<span>Carregando a ondulação…</span>`;
      try { dadosOnd[gradeOnd] = await carregarOnd(gradeOnd, ondVelho[gradeOnd]); delete ondVelho[gradeOnd]; campoCache = null; } catch (e) { $("#ondHora").innerHTML = `<span>Não consegui carregar a ondulação agora.</span>`; return; }
    }
    const D = dadosOnd[gradeOnd];
    if (ondT == null) { const rf = relogio.format(new Date()), agora = +rf.slice(0, 2) + +rf.slice(3, 5) / 60; ondT = Math.min(D.time.length - 1, Math.round((surfeDia * 24 + (surfeDia === 0 ? agora : 9)) / 3)); }
    ondT = Math.min(ondT, D.time.length - 1);
    $("#ondHora").innerHTML = `<div class="ond-l"><button id="ondPlay" aria-label="Animar">${ondPlay ? "❚❚" : "▶"}</button><span>Ondulação <b id="ondTxt">${nomeOndT(D, ondT)}</b></span></div>
      <input type="range" id="ondR" min="0" max="${D.time.length - 1}" step="1" value="${ondT}" aria-label="Horário">
      <div class="ond-dias">${datas.map((dt, d) => `<span>${d === 0 ? "Hoje" : d === 1 ? "Amanhã" : SEMANA[new Date(dt + "T12:00:00").getDay()]}</span>`).join("")}</div>`;
    $("#ondR").oninput = (e) => { ondT = +e.target.value; pararOnd(); atualizarOndT(); };
    $("#ondPlay").onclick = () => { if (ondPlay) pararOnd(); else tocarOnd(); };
    if (mapaOnd) { mapaOnd.resize(); pedirOnd(); return; }
    if (!window.maplibregl) return;
    let estilo = ESTILO_URL;
    try { estilo = estiloPraiometro(await buscarJSON(ESTILO_URL)); } catch (e) { console.warn("Estilo padrão do mapa", e); }
    // terra cinza, sem detalhes (como nos mapas de ondulação dos sites de surfe)
    if (estilo && estilo.layers) {
      estilo = JSON.parse(JSON.stringify(estilo));
      estilo.layers = estilo.layers.filter((l) => l.type === "background" || l.type === "symbol" && /place|city|country|state/.test(l.id) || (l.type === "fill" && (l.id === "water" || l["source-layer"] === "water")) || l.type === "line" && /boundary/.test(l.id));
      estilo.layers.forEach((l) => { l.paint = l.paint || {};
        if (l.type === "background") l.paint["background-color"] = "#C4C7CA";
        if (l.type === "fill") { l.paint["fill-color"] = "#9DB3C4"; l.paint["fill-opacity"] = 1; }
        if (l.type === "symbol") { l.paint["text-color"] = "#2E3A44"; l.paint["text-halo-color"] = "#E6E8EA"; } });
    }
    const c = GRADES_OND[gradeOnd].caixa;
    mapaOnd = new maplibregl.Map({ container: "ondMapa", style: estilo, bounds: [[c[0], c[1]], [c[2], c[3]]], fitBoundsOptions: { padding: 4 },
      attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false, maxZoom: GRADES_OND[gradeOnd].zMax,
      maxBounds: limitesOnd(gradeOnd) });
    mapaOnd.touchZoomRotate.disableRotation();
    mapaOnd.on("moveend", agendarMicro);
    mapaOnd.on("load", () => {
      ondPronto = true;
      mapaOnd.addSource("picosOnd", { type: "geojson", data: { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [-43.2, -22.99] } }] } });
      mapaOnd.addLayer({ id: "picosOnd", type: "circle", source: "picosOnd", paint: { "circle-radius": 5, "circle-color": "#FFB627", "circle-stroke-color": "#10283A", "circle-stroke-width": 2 } });
      pedirOnd();
    });
    mapaOnd.on("render", () => { if (!ondDesenhoPend) pedirOnd(); });
  }
  function atualizarOndT() { const D = dadosOnd[gradeOnd]; if (!D) return; if ($("#ondTxt")) $("#ondTxt").textContent = nomeOndT(D, ondT); if ($("#ondR")) $("#ondR").value = ondT; campoCache = null; if (micro) { calcMicro(); } pedirOnd(); }
  function tocarOnd() { pararOnd(); ondPlay = setInterval(() => { const D = dadosOnd[gradeOnd]; if (!D) return; ondT = (ondT + 1) % D.time.length; atualizarOndT(); }, 420); if ($("#ondPlay")) $("#ondPlay").textContent = "❚❚"; }
  function pararOnd() { if (ondPlay) clearInterval(ondPlay); ondPlay = null; if ($("#ondPlay")) $("#ondPlay").textContent = "▶"; }
  function pedirOnd() { if (ondDesenhoPend) return; ondDesenhoPend = true; requestAnimationFrame(() => { ondDesenhoPend = false; pintarOnd(); }); }
  // campo suavizado (bilinear) da altura das ondas na hora escolhida; terra recebe o valor do mar mais perto
  function campoOnd() {
    if (campoCache && campoCache.g === gradeOnd && campoCache.t === ondT) return campoCache;
    const g = GRADES_OND[gradeOnd], D = dadosOnd[gradeOnd], R = g.lin, C = g.col, U = g.sobe;
    const base = [];
    for (let i = 0; i < R; i++) { base.push([]); for (let j = 0; j < C; j++) base[i].push(D.a[i * C + j][ondT]); }
    // preenche a terra com o vizinho de mar mais perto (para a cor encostar certinho na costa)
    for (let passo = 0; passo < 6; passo++) {
      let falta = false;
      const nv = base.map((r) => r.slice());
      for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) if (base[i][j] == null) {
        const viz = [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < R && b < C && base[a][b] != null).map(([a, b]) => base[a][b]);
        if (viz.length) nv[i][j] = viz.reduce((s, v) => s + v, 0) / viz.length; else falta = true;
      }
      for (let i = 0; i < R; i++) base[i] = nv[i];
      if (!falta) break;
    }
    const R2 = (R - 1) * U + 1, C2 = (C - 1) * U + 1, F = [];
    for (let i = 0; i < R2; i++) {
      const fi = i / U, i0 = Math.min(R - 2, Math.floor(fi)), ti = fi - i0;
      F.push(new Float32Array(C2));
      for (let j = 0; j < C2; j++) {
        const fj = j / U, j0 = Math.min(C - 2, Math.floor(fj)), tj = fj - j0;
        const v = (a, b) => base[a][b] ?? 0;
        F[i][j] = v(i0, j0) * (1 - ti) * (1 - tj) + v(i0 + 1, j0) * ti * (1 - tj) + v(i0, j0 + 1) * (1 - ti) * tj + v(i0 + 1, j0 + 1) * ti * tj;
      }
    }
    campoCache = { g: gradeOnd, t: ondT, F, R2, C2 };
    return campoCache;
  }
  function pintarOnd() {
    const D = dadosOnd[gradeOnd];
    if (!mapaOnd || !ondPronto || !D || $("#ondBox").hidden) return;
    const g = GRADES_OND[gradeOnd], cv = $("#ondCanvas"), cont = $("#ondMapa"), dpr = Math.min(2, window.devicePixelRatio || 1);
    const Wc = cont.clientWidth, Hc = cont.clientHeight;
    if (cv.width !== Math.round(Wc * dpr) || cv.height !== Math.round(Hc * dpr)) { cv.width = Math.round(Wc * dpr); cv.height = Math.round(Hc * dpr); cv.style.width = Wc + "px"; cv.style.height = Hc + "px"; }
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, Wc, Hc);
    const { F, R2, C2 } = campoOnd(), U = g.sobe, dLat = g.passo / U, dLon = g.passo / U;
    // posição na tela de cada ponto do campo (Mercator: o y muda com a latitude)
    const xs = new Float32Array(C2), ys = new Float32Array(R2);
    for (let j = 0; j < C2; j++) xs[j] = mapaOnd.project([g.lon0 + j * dLon, g.lat1]).x;
    for (let i = 0; i < R2; i++) ys[i] = mapaOnd.project([g.lon0, g.lat1 - i * dLat]).y;
    // recorte pelo mar
    const camadasAgua = (mapaOnd.getStyle().layers || []).filter((l) => l.type === "fill" && (l.id === "water" || l["source-layer"] === "water")).map((l) => l.id);
    const feats = (camadasAgua.length ? mapaOnd.queryRenderedFeatures({ layers: camadasAgua }) : []).filter((f) => !f.properties || f.properties.class !== "lake");
    const mic = microValido() ? micro : null;
    ctx.save();
    if (feats.length) {
      const pth = new Path2D();
      const anel = (r) => { r.forEach((c, i) => { const pt = mapaOnd.project(c); i ? pth.lineTo(pt.x, pt.y) : pth.moveTo(pt.x, pt.y); }); pth.closePath(); };
      feats.forEach((f) => { const gm = f.geometry; if (gm.type === "Polygon") gm.coordinates.forEach(anel); else if (gm.type === "MultiPolygon") gm.coordinates.forEach((pl) => pl.forEach(anel)); });
      ctx.clip(pth, "nonzero");
    }
    // 1) cores: uma linha de pixels por faixa de latitude
    const img = document.createElement("canvas"); img.width = C2; img.height = R2;
    const ic = img.getContext("2d"), id = ic.createImageData(C2, R2);
    for (let i = 0; i < R2; i++) for (let j = 0; j < C2; j++) { const c = corOnd(F[i][j]), k = (i * C2 + j) * 4; id.data[k] = c[0]; id.data[k + 1] = c[1]; id.data[k + 2] = c[2]; id.data[k + 3] = 255; }
    ic.putImageData(id, 0, 0);
    ctx.imageSmoothingEnabled = true;
    const x0 = xs[0] - (xs[1] - xs[0]) / 2, x1 = xs[C2 - 1] + (xs[1] - xs[0]) / 2;
    for (let i = 0; i < R2; i++) {
      const yA = i ? (ys[i - 1] + ys[i]) / 2 : ys[0] - (ys[1] - ys[0]) / 2, yB = i < R2 - 1 ? (ys[i] + ys[i + 1]) / 2 : ys[i] + (ys[i] - ys[i - 1]) / 2;
      if (yB < -5 || yA > Hc + 5) continue;
      ctx.drawImage(img, 0, i, C2, 1, x0, yA, x1 - x0, yB - yA + 0.6);
    }
    if (mic) { pintarMicro(ctx, mic, Wc, Hc); ctx.restore(); grade(ctx, g, Hc, Wc); textoOnd(D, g, true); return; }
    // 2) linhas de contorno (a cada meio metro até 3 m, depois de metro em metro)
    ctx.lineWidth = 1; ctx.strokeStyle = "rgba(255,255,255,.75)";
    const interp = (a, b, v) => (v - a) / (b - a || 1e-6);
    ctx.beginPath();
    for (const L of NIVEIS_OND) {
      for (let i = 0; i < R2 - 1; i++) {
        const yA = ys[i], yB = ys[i + 1];
        if (Math.max(yA, yB) < -5 || Math.min(yA, yB) > Hc + 5) continue;
        for (let j = 0; j < C2 - 1; j++) {
          const a = F[i][j], b = F[i][j + 1], c = F[i + 1][j + 1], d = F[i + 1][j];
          const caso = (a >= L ? 8 : 0) | (b >= L ? 4 : 0) | (c >= L ? 2 : 0) | (d >= L ? 1 : 0);
          if (caso === 0 || caso === 15) continue;
          const xA = xs[j], xB = xs[j + 1];
          const top = [xA + (xB - xA) * interp(a, b, L), yA], dir = [xB, yA + (yB - yA) * interp(b, c, L)], bot = [xA + (xB - xA) * interp(d, c, L), yB], esq = [xA, yA + (yB - yA) * interp(a, d, L)];
          const seg = (p, q) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
          switch (caso) {
            case 1: case 14: seg(esq, bot); break; case 2: case 13: seg(bot, dir); break; case 3: case 12: seg(esq, dir); break;
            case 4: case 11: seg(top, dir); break; case 6: case 9: seg(top, bot); break; case 7: case 8: seg(esq, top); break;
            case 5: seg(esq, top); seg(bot, dir); break; case 10: seg(esq, bot); seg(top, dir); break;
          }
        }
      }
    }
    ctx.stroke();
    // 3) setas pretas: para onde a ondulação vai
    const espac = Math.abs(xs[U] - xs[0]), pula = espac < 16 ? 2 : 1, Lw = Math.max(8, Math.min(14, espac * 0.6));
    ctx.strokeStyle = "rgba(20,24,28,.85)"; ctx.lineWidth = 1.2; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    for (let i = 0; i < g.lin; i += pula) for (let j = 0; j < g.col; j += pula) {
      const k = i * g.col + j, a = D.a[k][ondT], dd = D.d[k][ondT];
      if (a == null || dd == null) continue;
      const px = xs[j * U], py = ys[i * U];
      if (px < -10 || py < -10 || px > Wc + 10 || py > Hc + 10) continue;
      const r = ((dd + 180) % 360) * Math.PI / 180, sx = Math.sin(r), sy = -Math.cos(r);
      const hx = px + sx * Lw / 2, hy = py + sy * Lw / 2;
      ctx.moveTo(px - sx * Lw / 2, py - sy * Lw / 2); ctx.lineTo(hx, hy);
      const ang = Math.atan2(sy, sx);
      ctx.moveTo(hx - Math.cos(ang - 0.5) * 4, hy - Math.sin(ang - 0.5) * 4); ctx.lineTo(hx, hy); ctx.lineTo(hx - Math.cos(ang + 0.5) * 4, hy - Math.sin(ang + 0.5) * 4);
    }
    ctx.stroke();
    ctx.restore();
    grade(ctx, g, Hc, Wc);
    textoOnd(D, g, false);
  }
  // 4) grade de latitude/longitude tracejada
  function grade(ctx, g, Hc, Wc) {
    ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = "rgba(0,0,0,.28)"; ctx.lineWidth = 1; ctx.beginPath();
    const st = mapaOnd.getZoom() >= 11 ? 0.05 : mapaOnd.getZoom() >= 8.5 ? 0.25 : g.linhaGrade, b = mapaOnd.getBounds();
    for (let lo = Math.ceil(b.getWest() / st) * st; lo <= b.getEast(); lo += st) { const x = mapaOnd.project([lo, b.getNorth()]).x; ctx.moveTo(x, 0); ctx.lineTo(x, Hc); }
    for (let la = Math.ceil(b.getSouth() / st) * st; la <= b.getNorth(); la += st) { const y = mapaOnd.project([b.getWest(), la]).y; ctx.moveTo(0, y); ctx.lineTo(Wc, y); }
    ctx.stroke(); ctx.restore();
  }
  // ondulação em alto-mar, em frente ao Rio (ponto da grade a ~35 km da costa)
  function altoMarRio(D, g) {
    const iR = Math.round((g.lat1 - -23.3) / g.passo), jR = Math.round((-43.2 - g.lon0) / g.passo), kR = iR * g.col + jR;
    const a = D.a[kR] && D.a[kR][ondT], d = D.d[kR] && D.d[kR][ondT], p = D.p[kR] && D.p[kR][ondT];
    return a == null || d == null ? null : { a, d, p };
  }
  function textoOnd(D, g, detalhe) {
    const r = altoMarRio(D, g);
    if ($("#ondRio")) $("#ondRio").innerHTML = !r ? "" : (detalhe ? "Alto-mar: " : "Em frente ao Rio: ") + `<b>${fmt1(r.a)} m · ${r.p ?? "–"} s · de ${rumo(r.d)}</b>` +
      (mascaraCarregando ? " · carregando o detalhe da costa…" : "");
    if ($(".ond-obs")) $(".ond-obs").textContent = detalhe
      ? "Detalhe da costa: quanto da ondulação chega em cada trecho, descontando o abrigo de pedras, pontões e ilhas · setas: por onde ela entra"
      : gradeOnd === "costa" ? "Cor e linhas brancas: altura das ondas · setas: para onde a ondulação vai · dê zoom numa praia para ver o detalhe"
      : "Cor e linhas brancas: altura das ondas · setas: para onde a ondulação vai";
  }

  // ---------- detalhe da costa do Rio (zoom de praia) ----------
  // O modelo de ondas tem pontos a cada ~9 km: não enxerga o Leme. Aqui a gente pega a ondulação de alto-mar
  // e "joga" ela contra o desenho real da costa (pedras, pontões, ilhas): cada pedacinho de mar recebe
  // a parte da ondulação que consegue chegar até ele sem bater em terra (com espalhamento, que é como
  // a onda contorna uma ponta). É uma estimativa geométrica, sem profundidade do fundo.
  const MASCARA_RJ = { w: -43.80, e: -42.80, s: -23.22, n: -22.78, z: 11.2 };
  const ZOOM_MICRO = 10.3;
  let mascara = null, mascaraCarregando = false, mascaraFalhou = false, micro = null, microTimer = null;
  const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
  const latDeY = (y) => Math.atan(Math.sinh(y)) * 180 / Math.PI;
  const microValido = () => micro && mapaOnd && gradeOnd === "costa" && mapaOnd.getZoom() >= ZOOM_MICRO && micro.t === ondT;
  function agendarMicro() {
    clearTimeout(microTimer);
    if (!mapaOnd || gradeOnd !== "costa" || mapaOnd.getZoom() < ZOOM_MICRO) { if (micro) { micro = null; pedirOnd(); } return; }
    if (!mascara) { carregarMascara(); return; }
    microTimer = setTimeout(calcMicro, 60);
  }
  // desenha só a água (linha de costa do OpenStreetMap) num mapa escondido e guarda como máscara terra/mar
  async function carregarMascara() {
    if (mascara || mascaraCarregando || mascaraFalhou || !mapaOnd) return;
    mascaraCarregando = true; pedirOnd();
    const M = MASCARA_RJ, S = 512 * Math.pow(2, M.z);
    const W = Math.round((M.e - M.w) / 360 * S), H = Math.round((mercY(M.n) - mercY(M.s)) / (2 * Math.PI) * S);
    const div = document.createElement("div");
    div.style.cssText = `position:fixed;left:${-W - 100}px;top:0;width:${W}px;height:${H}px;pointer-events:none`;
    document.body.appendChild(div);
    let m = null;
    try {
      const srcs = mapaOnd.getStyle().sources, nome = Object.keys(srcs).find((k) => srcs[k].type === "vector");
      m = new maplibregl.Map({ container: div, interactive: false, attributionControl: false, pixelRatio: 1, preserveDrawingBuffer: true, fadeDuration: 0,
        center: [(M.w + M.e) / 2, latDeY((mercY(M.n) + mercY(M.s)) / 2)], zoom: M.z,
        style: { version: 8, sources: { v: srcs[nome] }, layers: [
          { id: "terra", type: "background", paint: { "background-color": "#fff" } },
          { id: "mar", type: "fill", source: "v", "source-layer": "water", filter: ["!=", ["get", "class"], "lake"], paint: { "fill-color": "#000", "fill-antialias": false } }] } });
      await new Promise((ok, erro) => { m.once("idle", ok); setTimeout(() => erro(new Error("demorou")), 30000); });
      const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      const cx = cv.getContext("2d", { willReadFrequently: true });
      cx.drawImage(m.getCanvas(), 0, 0, W, H);
      const px = cx.getImageData(0, 0, W, H).data, agua = new Uint8Array(W * H);
      let n = 0;
      for (let i = 0; i < W * H; i++) if (px[i * 4] < 128) { agua[i] = 1; n++; }
      if (n < W * H * 0.1 || n > W * H * 0.95) throw new Error("máscara vazia");
      const b = m.getBounds();
      mascara = { W, H, agua, w: b.getWest(), e: b.getEast(), yN: mercY(b.getNorth()), yS: mercY(b.getSouth()),
        kmPx: (b.getEast() - b.getWest()) / W * 111.32 * Math.cos(23 * Math.PI / 180) };
    } catch (e) { console.warn("Detalhe da costa", e); mascaraFalhou = true; }
    try { if (m) m.remove(); } catch (e) { /* nada */ }
    div.remove();
    mascaraCarregando = false;
    agendarMicro(); pedirOnd();
  }
  // fração da ondulação que chega num ponto (pixel da máscara) vinda de "dir" (graus, de onde vem)
  function chegada(mx, my, dir, sig) {
    const { W, H, agua } = mascara, Lmax = 18 / mascara.kmPx;
    let sw = 0, so = 0, vx = 0, vy = 0;
    for (let o = -48; o <= 48; o += 8) {
      const w = Math.exp(-0.5 * (o / sig) * (o / sig)); sw += w;
      const r = (dir + o) * Math.PI / 180, dx = Math.sin(r), dy = -Math.cos(r);
      let d = 1.5, livre = true;
      while (d < Lmax) {
        const x = Math.round(mx + dx * d), y = Math.round(my + dy * d);
        if (y < 0) { livre = false; break; }               // saiu pelo norte: é continente
        if (x < 0 || x >= W || y >= H) break;               // saiu pelo mar aberto
        if (!agua[y * W + x]) { livre = false; break; }
        d += Math.max(1, d / 28);
      }
      if (livre) { so += w; vx += w * dx; vy += w * dy; }
    }
    return { E: so / sw, vx, vy };
  }
  const naMascara = (lon, Y) => [(lon - mascara.w) / (mascara.e - mascara.w) * mascara.W, (mascara.yN - Y) / (mascara.yN - mascara.yS) * mascara.H];
  const ehTerra = (mx, my) => { const x = Math.round(mx), y = Math.round(my); return x >= 0 && y >= 0 && x < mascara.W && y < mascara.H && !mascara.agua[y * mascara.W + x]; };
  function calcMicro() {
    const D = dadosOnd[gradeOnd];
    if (!mascara || !mapaOnd || !D || gradeOnd !== "costa" || mapaOnd.getZoom() < ZOOM_MICRO) { micro = null; pedirOnd(); return; }
    const alto = altoMarRio(D, GRADES_OND.costa);
    if (!alto) { micro = null; return; }
    const cont = $("#ondMapa"), Wc = cont.clientWidth, Hc = cont.clientHeight, P = 5;
    const nx = Math.ceil(Wc / P) + 2, ny = Math.ceil(Hc / P) + 2;
    const pA = mapaOnd.unproject([-P, -P]), pB = mapaOnd.unproject([(nx - 2) * P, (ny - 2) * P]);
    const lonA = pA.lng, lonB = pB.lng, YA = mercY(pA.lat), YB = mercY(pB.lat);
    const sig = alto.p >= 12 ? 14 : alto.p >= 9 ? 20 : 28;   // ondulação longa contorna menos as pontas
    const val = new Float32Array(nx * ny).fill(NaN), E = new Float32Array(nx * ny), VX = new Float32Array(nx * ny), VY = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) {
      const Y = YA + (YB - YA) * j / (ny - 1);
      for (let i = 0; i < nx; i++) {
        const [mx, my] = naMascara(lonA + (lonB - lonA) * i / (nx - 1), Y), k = j * nx + i;
        if (ehTerra(mx, my)) continue;
        const c = chegada(mx, my, alto.d, sig);
        E[k] = c.E; VX[k] = c.vx; VY[k] = c.vy; val[k] = alto.a * Math.sqrt(c.E);
      }
    }
    // encosta a cor na areia: terra recebe o valor do mar vizinho
    const cheio = val.slice();
    for (let passo = 0; passo < 3; passo++) {
      const nv = cheio.slice();
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; if (!isNaN(cheio[k])) continue;
        let s = 0, n = 0; for (const [a, b] of [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]]) { if (a < 0 || b < 0 || a >= nx || b >= ny) continue; const v = cheio[b * nx + a]; if (!isNaN(v)) { s += v; n++; } }
        if (n) nv[k] = s / n; }
      cheio.set(nv);
    }
    const img = document.createElement("canvas"); img.width = nx; img.height = ny;
    const ic = img.getContext("2d"), id = ic.createImageData(nx, ny);
    for (let k = 0; k < nx * ny; k++) { if (isNaN(cheio[k])) continue; const c = corOnd(cheio[k]); id.data[k * 4] = c[0]; id.data[k * 4 + 1] = c[1]; id.data[k * 4 + 2] = c[2]; id.data[k * 4 + 3] = 255; }
    ic.putImageData(id, 0, 0);
    // valor de cada praia (ponto a ~300 m da areia, no mar)
    const praias = PICOS().map((p) => { const ll = noMar(p, 0.3), [mx, my] = naMascara(ll[0], mercY(ll[1]));
      if (ehTerra(mx, my)) return null; const c = chegada(mx, my, alto.d, sig); return { p, ll, a: alto.a * Math.sqrt(c.E) }; }).filter(Boolean);
    micro = { t: ondT, nx, ny, P, val, cheio, E, VX, VY, img, lonA, lonB, latA: pA.lat, latB: pB.lat, praias };
    pedirOnd();
  }
  function pintarMicro(ctx, m, Wc, Hc) {
    const a = mapaOnd.project([m.lonA, m.latA]), b = mapaOnd.project([m.lonB, m.latB]);
    const sx = (b.x - a.x) / (m.nx - 1), sy = (b.y - a.y) / (m.ny - 1);
    const X = (i) => a.x + i * sx, Y = (j) => a.y + j * sy;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(m.img, a.x - sx / 2, a.y - sy / 2, sx * m.nx, sy * m.ny);
    // linhas de mesma altura (a cada 25 cm)
    const F = m.cheio, nx = m.nx, mx = Math.max(...F.filter((v) => !isNaN(v)));
    const niveis = []; for (let L = 0.25; L < Math.min(9, mx); L += L < 3 ? 0.25 : 1) niveis.push(L);
    ctx.lineWidth = 1; ctx.strokeStyle = "rgba(255,255,255,.7)";
    const interp = (p, q, v) => (v - p) / (q - p || 1e-6);
    ctx.beginPath();
    for (const L of niveis) for (let j = 0; j < m.ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const p = F[j * nx + i], q = F[j * nx + i + 1], r = F[(j + 1) * nx + i + 1], s = F[(j + 1) * nx + i];
      if (isNaN(p) || isNaN(q) || isNaN(r) || isNaN(s)) continue;
      const caso = (p >= L ? 8 : 0) | (q >= L ? 4 : 0) | (r >= L ? 2 : 0) | (s >= L ? 1 : 0);
      if (caso === 0 || caso === 15) continue;
      const xA = X(i), xB = X(i + 1), yA = Y(j), yB = Y(j + 1);
      const top = [xA + (xB - xA) * interp(p, q, L), yA], dir = [xB, yA + (yB - yA) * interp(q, r, L)], bot = [xA + (xB - xA) * interp(s, r, L), yB], esq = [xA, yA + (yB - yA) * interp(p, s, L)];
      const seg = (u, v) => { ctx.moveTo(u[0], u[1]); ctx.lineTo(v[0], v[1]); };
      switch (caso) {
        case 1: case 14: seg(esq, bot); break; case 2: case 13: seg(bot, dir); break; case 3: case 12: seg(esq, dir); break;
        case 4: case 11: seg(top, dir); break; case 6: case 9: seg(top, bot); break; case 7: case 8: seg(esq, top); break;
        case 5: seg(esq, top); seg(bot, dir); break; case 10: seg(esq, bot); seg(top, dir); break;
      }
    }
    ctx.stroke();
    // setas: por onde a ondulação entra em cada trecho (contornando as pontas)
    const passo = Math.max(1, Math.round(34 / Math.abs(sx))), Lw = 13;
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 1.4;
    for (let j = 1; j < m.ny; j += passo) for (let i = 1; i < nx; i += passo) {
      const k = j * nx + i; if (isNaN(m.val[k]) || m.E[k] < 0.04) continue;
      const px = X(i), py = Y(j); if (px < -10 || py < -10 || px > Wc + 10 || py > Hc + 10) continue;
      const n = Math.hypot(m.VX[k], m.VY[k]) || 1, ux = -m.VX[k] / n, uy = -m.VY[k] / n;   // vai no sentido contrário de onde vem
      const hx = px + ux * Lw / 2, hy = py + uy * Lw / 2, ang = Math.atan2(uy, ux);
      ctx.strokeStyle = `rgba(20,24,28,${(0.3 + 0.6 * Math.min(1, m.E[k])).toFixed(2)})`;
      ctx.beginPath();
      ctx.moveTo(px - ux * Lw / 2, py - uy * Lw / 2); ctx.lineTo(hx, hy);
      ctx.moveTo(hx - Math.cos(ang - 0.5) * 4.5, hy - Math.sin(ang - 0.5) * 4.5); ctx.lineTo(hx, hy); ctx.lineTo(hx - Math.cos(ang + 0.5) * 4.5, hy - Math.sin(ang + 0.5) * 4.5);
      ctx.stroke();
    }
    // etiqueta de cada praia
    if (mapaOnd.getZoom() >= 11) {
      ctx.font = "600 12px system-ui, -apple-system, sans-serif"; ctx.textBaseline = "middle";
      const usados = [];
      m.praias.forEach((q) => {
        const pt = mapaOnd.project(q.ll); if (pt.x < 0 || pt.y < 0 || pt.x > Wc || pt.y > Hc) return;
        const t = `${q.p.nome} ${fmt1(q.a)} m`, w = ctx.measureText(t).width + 14;
        if (usados.some((u) => Math.abs(u.x - pt.x) < (u.w + w) / 2 && Math.abs(u.y - pt.y) < 22)) return;
        usados.push({ x: pt.x, y: pt.y, w });
        ctx.fillStyle = "rgba(16,40,58,.88)"; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(pt.x - w / 2, pt.y - 10, w, 20, 10); else ctx.rect(pt.x - w / 2, pt.y - 10, w, 20); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(t, pt.x, pt.y + 0.5);
      });
    }
  }

  // ---------- relatório detalhado de cada quadradinho (selo): gráfico com régua arrastável ----------
  const NOME_CEU = { sol: "Sol", parcial: "Sol entre nuvens", nublado: "Nublado", chuva: "Chuva", noite: "Sem sol" };
  const COR_CEU = { sol: "#FFB627", parcial: "#FFD98A", nublado: "#8C9AA5", chuva: "#5B7FA3", noite: "#B9C0D4" };
  const SAUDE_UV = ["Risco baixo para a pele.", "Use protetor solar.", "Protetor, chapéu e óculos.", "Protetor FPS 50 e reaplique sempre.", "Queima rápido: proteção máxima."];
  const faixaIdx = (u) => FAIXAS_UV.findIndex((f) => u <= f.ate) < 0 ? FAIXAS_UV.length - 1 : FAIXAS_UV.findIndex((f) => u <= f.ate);
  const marCat = (o) => o < 0.6 ? { n: "Piscininha", c: "#8FD3EA" } : o < 1.2 ? { n: "Marolinha", c: "#4FB3D9" } : o < 2 ? { n: "Mar mexido", c: "#1E8FC6" } : { n: "Mar pesado", c: "#0B3F6B" };
  const ventoCat = (v) => v <= 10 ? { n: "Vento fraco", c: "#7CC99A" } : v <= 15 ? { n: "Brisa", c: "#F2C12E" } : v <= 20 ? { n: "Vento moderado", c: "#F08A3C" } : { n: "Ventania", c: "#D9534F" };
  const aguaCat = (t) => t < 20 ? "Gelada" : t < 22.5 ? "Fresquinha" : "Quentinha";
  let relAtual = null, relAberto = null;
  function configRelatorio(k, l) {
    const { p, x } = l;
    const hs = x.horas;
    if (k === "ceu") return { titulo: "Céu hora a hora", unid: "°", min: Math.min(...hs.map((y) => y.t)) - 4, max: Math.max(...hs.map((y) => y.t)) + 2, tipo: "barra",
      pts: hs.map((y) => ({ h: y.h, v: y.t, cor: COR_CEU[y.est], rot: y.chuva >= 20 ? y.chuva + "%" : "" })), barraNome: "Temperatura",
      texto: (q, y = hs.find((z) => z.h === q.h)) => `<b>${NOME_CEU[y.est]}</b><span>Nuvens ${y.nuvens}% · Chuva ${y.chuva}% · ${y.t}°</span>`,
      resumo: () => { const sol = hs.filter((y) => y.est === "sol").map((y) => y.h), ch = hs.filter((y) => y.chuva >= 50).map((y) => y.h);
        return [sol.length ? `Sol firme em ${sol.length} h (${sol[0]}h às ${sol[sol.length - 1] + 1}h)` : "Sem sol firme", ch.length ? `Chance alta de chuva a partir das ${ch[0]}h` : "Sem chance alta de chuva", `Máxima de ${x.temp}°`]; },
      leg: Object.keys(NOME_CEU).map((e) => [COR_CEU[e], NOME_CEU[e]]), nota: "Altura da barra: temperatura · número azul: chance de chuva" };
    if (k === "uv") { const pts = hs.filter((y) => y.uv != null).map((y) => ({ h: y.h, v: Math.round(y.uv * 10) / 10, cor: FAIXAS_UV[faixaIdx(y.uv)].cor }));
      return { titulo: "Índice UV hora a hora", unid: "", max: Math.max(11, ...pts.map((q) => q.v)), tipo: "barra", pts, barraNome: "UV",
        texto: (q) => `<b>UV ${Math.round(q.v)} · ${FAIXAS_UV[faixaIdx(q.v)].nome}</b><span>${SAUDE_UV[faixaIdx(q.v)]}</span>`,
        resumo: () => { const pk = pts.reduce((a, b) => (b.v > a.v ? b : a), pts[0] || { v: 0, h: 0 }), alto = pts.filter((q) => q.v >= 6);
          return [`Pico ${Math.round(pk.v)} às ${pk.h}h`, alto.length ? `UV alto ou mais das ${alto[0].h}h às ${alto[alto.length - 1].h + 1}h` : "Sem UV alto no dia"]; },
        leg: FAIXAS_UV.map((f) => [f.cor, f.nome]) }; }
    if (k === "mar") { const pts = (x.marH || []).filter((q) => q.o != null).map((q) => ({ h: q.h, v: Math.round(q.o * 10) / 10, cor: marCat(q.o).c, d: q.d, per: q.per }));
      return { titulo: p.baia ? "Mar de baía" : "Ondas hora a hora", unid: "m", max: Math.max(1.5, ...pts.map((q) => q.v)), tipo: "barra", pts, barraNome: "Ondas (m)", setas: true,
        texto: (q) => `<b>${fmt1(q.v)} m · ${marCat(q.v).n}</b><span>${q.per ? Math.round(q.per) + " s" : ""}${q.d != null ? " · de " + rumo(q.d) : ""}</span>`,
        resumo: () => { if (!pts.length) return ["Sem dado do mar agora"]; const mx = pts.reduce((a, b) => (b.v > a.v ? b : a)), mn = pts.reduce((a, b) => (b.v < a.v ? b : a));
          return [`Maior às ${mx.h}h: ${fmt1(mx.v)} m`, `Menor às ${mn.h}h: ${fmt1(mn.v)} m`, ...(p.baia ? ["Dentro da baía o mar fica calmo"] : [])]; },
        leg: [["#8FD3EA", "Piscininha"], ["#4FB3D9", "Marolinha"], ["#1E8FC6", "Mexido"], ["#0B3F6B", "Pesado"]] }; }
    if (k === "agua") { const pts = (x.marH || []).filter((q) => q.s != null).map((q) => ({ h: q.h, v: Math.round(q.s * 10) / 10, cor: "#16A3C9" }));
      const lo = Math.min(...pts.map((q) => q.v)), hi = Math.max(...pts.map((q) => q.v));
      return { titulo: "Temperatura da água", unid: "°C", min: Math.floor(lo - 1), max: Math.ceil(hi + 1), tipo: "linha", pts, barraNome: "Água °C",
        texto: (q) => `<b>${fmt1(q.v)} °C · ${aguaCat(q.v)}</b><span>Temperatura na superfície do mar</span>`,
        resumo: () => pts.length ? [`Entre ${fmt1(lo)} e ${fmt1(hi)} °C no dia`] : ["Sem dado da temperatura"], leg: [] }; }
    if (k === "vento") { const pts = hs.filter((y) => y.v != null).map((y) => ({ h: y.h, v: y.v, cor: ventoCat(y.v).c, d: y.vd, raj: y.raj }));
      return { titulo: "Vento hora a hora", unid: "km/h", max: Math.max(25, ...pts.map((q) => q.v)), tipo: "barra", pts, barraNome: "Vento (km/h)", setas: true, setaVento: true,
        texto: (q) => `<b>${q.v} km/h · ${ventoCat(q.v).n}</b><span>${q.d != null ? "De " + rumo(q.d) : ""}${q.raj ? " · rajadas de " + q.raj + " km/h" : ""}</span>`,
        resumo: () => { if (!pts.length) return ["Sem dado do vento"]; const mx = pts.reduce((a, b) => (b.v > a.v ? b : a)), calmo = pts.filter((q) => q.v <= 10);
          return [`Mais forte às ${mx.h}h: ${mx.v} km/h`, calmo.length ? `Mais calmo das ${calmo[0].h}h às ${calmo[calmo.length - 1].h + 1}h` : "Sem horário de vento fraco"]; },
        leg: [["#7CC99A", "Fraco"], ["#F2C12E", "Brisa"], ["#F08A3C", "Moderado"], ["#D9534F", "Ventania"]] }; }
    return null;
  }
  function abrirRelatorio(k, l) {
    relAberto = { k, id: l.p.id, min: null };
    if (k === "surfe" && l.p.mar != null) { surfeDia = estado.dia; surfeAberta = l.p.id; surfeHora = null; desenharSurfe(); $("#surfeTela").hidden = false; document.body.style.overflow = "hidden"; return; }
    const sh = $("#relTela"), corpo = $("#relCorpo");
    $("#relLocal").textContent = `${l.p.nome} · ${nomeDia(estado.dia)}`;
    if (k === "inea") {
      const x = l.x, dt = x.aguaData ? x.aguaData.slice(8, 10) + "/" + x.aguaData.slice(5, 7) + "/" + x.aguaData.slice(0, 4) : null;
      $("#relTitulo").textContent = "Balneabilidade (INEA)";
      corpo.innerHTML = `<div class="rel-agora"><b>${x.propria === true ? "Água própria" : x.propria === false ? "Água imprópria" : x.aguaTotal ? `Própria em ${x.aguaOk} de ${x.aguaTotal} pontos` : "Sem boletim"}</b>
        <span>${dt ? "Coleta de " + dt : ""}</span></div>
        ${x.aguaTotal ? `<div class="rel-pontos">${Array.from({ length: x.aguaTotal }, (_, i) => `<i class="${i < x.aguaOk ? "ok" : "ruim"}">Ponto ${i + 1}: ${i < x.aguaOk ? "próprio" : "impróprio"}</i>`).join("")}</div>` : ""}
        <ul class="rel-resumo"><li>O INEA coleta a água toda semana e publica o boletim às quintas.</li><li>Depois de chuva forte, a água costuma piorar por até 24 h.</li></ul>
        <a class="pico-abrir rel-link" href="https://www.inea.rj.gov.br/ar-agua-e-solo/balneabilidade-das-praias/" target="_blank" rel="noopener">Ver boletim no site do INEA ›</a>`;
      sh.hidden = false; document.body.style.overflow = "hidden"; return;
    }
    const cfg = configRelatorio(k, l);
    if (!cfg || !cfg.pts.length) return;
    relAtual = cfg;
    $("#relTitulo").textContent = cfg.titulo;
    corpo.innerHTML = `<div class="rel-agora" id="relTxt"></div>${graficoRelatorio(cfg)}
      ${cfg.leg.length ? `<div class="pico-leg">${cfg.leg.map(([c, n]) => `<span><i style="background:${c}"></i>${n}</span>`).join("")}${cfg.linha ? `<span><i style="background:#2F6FB0;height:3px;border-radius:2px"></i>${cfg.linhaNome}</span>` : ""}</div>` : ""}
      <p class="rel-dica">${cfg.nota ? cfg.nota + "<br>" : ""}Arraste no gráfico para ver cada horário</p>
      <h3 class="rel-h3">Resumo do dia</h3><ul class="rel-resumo">${cfg.resumo().map((t) => `<li>${t}</li>`).join("")}</ul>`;
    sh.hidden = false; document.body.style.overflow = "hidden";
    const agH = estado.dia === 0 ? +relogio.format(new Date()).slice(0, 2) : 12;
    moverRel(agH * 60 + (estado.dia === 0 ? +relogio.format(new Date()).slice(3, 5) : 0));
    ligarRel();
  }
  function fecharRelatorio() { $("#relTela").hidden = true; document.body.style.overflow = ""; relAtual = null; relAberto = null; }
  // gráfico: barras (ou linha) de 6h às 20h, com régua amarela
  let relGeo = null;
  function graficoRelatorio(cfg) {
    const W = 340, H = 200, esq = 30, dir = 8, topo = 18, base = cfg.setas ? 150 : 166;
    const pts = cfg.pts, n = pts.length, h0 = pts[0].h, h1 = pts[n - 1].h + 1;
    const lo = cfg.min ?? 0, hi = cfg.max;
    const X = (min) => esq + (W - esq - dir) * (min - h0 * 60) / ((h1 - h0) * 60), Y = (v) => base - (base - topo) * (v - lo) / (hi - lo);
    const larg = (W - esq - dir) / (h1 - h0);
    let grade = "";
    const passo = (hi - lo) <= 3 ? 0.5 : (hi - lo) <= 12 ? 2 : (hi - lo) <= 30 ? 5 : 25;
    for (let v = Math.ceil(lo / passo) * passo; v <= hi + 1e-9; v += passo) grade += `<line x1="${esq}" x2="${W - dir}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#E8EEF2"/><text x="${esq - 4}" y="${(Y(v) + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#6B7A86">${fmt1(v)}</text>`;
    let marcas = "";
    if (cfg.tipo === "barra") marcas = pts.map((q) => { const x0 = X(q.h * 60) + 2, y = Y(Math.max(lo, q.v)); return `<rect x="${x0.toFixed(1)}" y="${y.toFixed(1)}" width="${(larg - 4).toFixed(1)}" height="${Math.max(1.5, base - y).toFixed(1)}" rx="3" fill="${q.cor}"/>${q.rot ? `<text x="${(x0 + (larg - 4) / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="800" fill="#2F6FB0">${q.rot}</text>` : ""}`; }).join("");
    else { const d = pts.map((q, i) => `${i ? "L" : "M"}${X(q.h * 60 + 30).toFixed(1)},${Y(q.v).toFixed(1)}`).join(" ");
      marcas = `<path d="${d} L${X(pts[n - 1].h * 60 + 30).toFixed(1)},${base} L${X(pts[0].h * 60 + 30).toFixed(1)},${base} Z" fill="#16A3C9" opacity=".15"/><path d="${d}" fill="none" stroke="#16A3C9" stroke-width="2.5"/>`; }
    if (cfg.linha) { const d = cfg.linha.map((q, i) => `${i ? "L" : "M"}${X(q.h * 60 + 30).toFixed(1)},${(base - (base - topo) * q.v / 100).toFixed(1)}`).join(" ");
      marcas += `<path d="${d}" fill="none" stroke="#2F6FB0" stroke-width="2" stroke-dasharray="1 0"/>`; }
    let eixo = "";
    for (let h = h0; h <= h1; h += 2) eixo += `<text x="${X(h * 60).toFixed(1)}" y="${H - 22 + (cfg.setas ? 0 : 0)}" text-anchor="middle" font-size="9" fill="#6B7A86">${h}h</text>`;
    let setas = "";
    if (cfg.setas) setas = pts.map((q) => q.d == null ? "" : `<g transform="translate(${(X(q.h * 60) + larg / 2).toFixed(1)} ${base + 12}) rotate(${(q.d + 180) % 360})"><path d="M0 -6 L4 1 L1 1 L1 6 L-1 6 L-1 1 L-4 1 Z" fill="#33505F"/></g>`).join("");
    relGeo = { X, Y, esq, dir, W, h0, h1, base, topo, larg };
    return `<svg viewBox="0 0 ${W} ${H - 10}" class="rel-graf" id="relSvg" role="img" aria-label="${cfg.titulo}">
      ${grade}${marcas}${setas}${eixo}
      <g id="rcG" style="pointer-events:none"><rect id="rcB" x="0" y="${topo - 8}" width="0" height="${base - topo + 8}" fill="#E8A400" opacity=".12"/>
        <line id="rcL" x1="0" x2="0" y1="${topo - 10}" y2="${base}" stroke="#E8A400" stroke-width="2" stroke-dasharray="4 3"/>
        <rect id="rcA" x="-9" y="${base - 7}" width="18" height="14" rx="7" fill="#E8A400"/>
        <path id="rcS" d="M-4.5 ${base - 3} l-3 3 l3 3 M4.5 ${base - 3} l3 3 l-3 3" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>
    </svg>`;
  }
  function moverRel(min) {
    const g = relGeo, cfg = relAtual;
    if (!g || !cfg || !$("#relSvg")) return;
    min = Math.min(g.h1 * 60 - 1, Math.max(g.h0 * 60, min));
    const h = Math.floor(min / 60), q = cfg.pts.find((z) => z.h === h) || cfg.pts[0];
    const cx = g.X(h * 60) + g.larg / 2;
    $("#rcL").setAttribute("x1", cx); $("#rcL").setAttribute("x2", cx);
    $("#rcB").setAttribute("x", g.X(h * 60)); $("#rcB").setAttribute("width", g.larg);
    $("#rcA").setAttribute("x", cx - 9); $("#rcS").setAttribute("transform", `translate(${cx} 0)`);
    const ag = estado.dia === 0 && h === +relogio.format(new Date()).slice(0, 2);
    $("#relTxt").innerHTML = `<small>${ag ? "Agora · " : ""}${h}h</small>${cfg.texto(q)}`;
    if (relAberto) relAberto.min = min;
  }
  function ligarRel() {
    const svg = $("#relSvg"), g = relGeo;
    if (!svg) return;
    const paraMin = (ev) => { const r = svg.getBoundingClientRect(), vx = (ev.clientX - r.left) * g.W / r.width; return g.h0 * 60 + (vx - g.esq) / (g.W - g.esq - g.dir) * (g.h1 - g.h0) * 60; };
    let arr = false;
    svg.addEventListener("pointerdown", (ev) => { arr = true; svg.setPointerCapture(ev.pointerId); moverRel(paraMin(ev)); });
    svg.addEventListener("pointermove", (ev) => { if (arr) moverRel(paraMin(ev)); });
    svg.addEventListener("pointerup", () => { arr = false; }); svg.addEventListener("pointercancel", () => { arr = false; });
  }

  // ---------- compartilhar: monta uma imagem do cartão no formato de story (1080 x 1920) ----------
  const COR_SELO = { sol: ["#FFE7B3", "#5E3B00"], bronze: ["#FFD9C2", "#6E2A08"], mar: ["#CDEFF6", "#0A4A5C"], mexido: ["#CDE0EA", "#0A3A4D"],
    quente: ["#D8F1E4", "#0C4F33"], frio: ["#D6E4F5", "#12345C"], neutro: ["#E7EEF3", "#1F3546"], ok: ["#D8F1E4", "#0C4F33"], ruim: ["#FBDAD5", "#7F1A10"] };
  function quebrar(ctx, texto, larg) {
    const palavras = texto.split(" "), linhasT = []; let atual = "";
    palavras.forEach((w) => { const t = atual ? atual + " " + w : w; if (ctx.measureText(t).width > larg && atual) { linhasT.push(atual); atual = w; } else atual = t; });
    if (atual) linhasT.push(atual);
    return linhasT;
  }
  function arred(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  async function gerarImagem(l) {
    const { p, x, a } = l;
    try { await document.fonts.ready; } catch (e) {}
    const W = 1080, H = 1920, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#F6EFE3"; ctx.fillRect(0, 0, W, H);
    // cena
    const c = cena(a, x, p);
    const svgTxt = c.svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="760" ');
    const img = new Image();
    await new Promise((ok, erro) => { img.onload = ok; img.onerror = erro; img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgTxt); });
    ctx.save(); arred(ctx, 40, 40, W - 80, 760, 56); ctx.clip(); ctx.drawImage(img, 40, 40, W - 80, 760); ctx.restore();
    const escuro = c.escura;
    ctx.fillStyle = escuro ? "#FFFFFF" : "#10283A";
    let tam = 96; ctx.font = `700 ${tam}px Unbounded, 'Arial Rounded MT Bold', sans-serif`;
    while (ctx.measureText(p.nome).width > 640 && tam > 56) { tam -= 4; ctx.font = `700 ${tam}px Unbounded, 'Arial Rounded MT Bold', sans-serif`; }
    ctx.fillText(p.nome, 90, 175);
    ctx.font = "600 34px Figtree, sans-serif"; ctx.fillText(`${nomeDia(estado.dia).replace(/^./, (q) => q.toUpperCase())} · ${p.local}`, 92, 228);
    // frase
    ctx.fillStyle = "#10283A"; ctx.font = "600 52px Figtree, sans-serif";
    let y = 900;
    quebrar(ctx, a.veredito, W - 160).slice(0, 4).forEach((t) => { ctx.fillText(t, 80, y); y += 68; });
    // selos (2 colunas)
    y = Math.max(y + 20, 1180);
    const sw = (W - 160 - 24) / 2, sh = 128;
    a.selos.slice(0, 6).forEach((s, i) => {
      const cx = 80 + (i % 2) * (sw + 24), cy = y + Math.floor(i / 2) * (sh + 24);
      const [bg, fg] = COR_SELO[s.cls] || COR_SELO.neutro;
      ctx.fillStyle = bg; arred(ctx, cx, cy, sw, sh, 28); ctx.fill();
      ctx.fillStyle = fg; ctx.font = "800 40px Figtree, sans-serif"; ctx.fillText(s.t, cx + 30, cy + 56);
      ctx.font = "500 30px Figtree, sans-serif"; ctx.fillText(quebrar(ctx, s.s, sw - 56)[0], cx + 30, cy + 98);
    });
    // rodapé
    ctx.fillStyle = "#10283A"; ctx.font = "700 52px Unbounded, sans-serif"; ctx.textAlign = "center"; ctx.fillText("Praiômetro", W / 2, H - 130);
    ctx.fillStyle = "#5A6B78"; ctx.font = "500 34px Figtree, sans-serif"; ctx.fillText("praiometrorio.github.io/praiometro", W / 2, H - 78); ctx.textAlign = "left";
    return new Promise((ok) => cv.toBlob(ok, "image/png"));
  }
  async function compartilhar(l) {
    const bt = $("#compartilhar"); bt.disabled = true;
    try {
      const blob = await gerarImagem(l);
      const nome = `praiometro-${l.p.id}.png`;
      const arq = new File([blob], nome, { type: "image/png" });
      const texto = `${l.p.nome} ${nomeDia(estado.dia)}: ${l.a.veredito} https://praiometrorio.github.io/praiometro/`;
      if (navigator.canShare && navigator.canShare({ files: [arq] })) {
        await navigator.share({ files: [arq], text: texto, title: "Praiômetro" });
      } else {
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      }
    } catch (e) { if (e && e.name !== "AbortError") console.error(e); }
    bt.disabled = false;
  }

  // ---------- busca de praia ----------
  const semAcento = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  // apelidos e pontos conhecidos para achar a praia por outro nome
  const APELIDOS = {
    copacabana: "copa posto 2 posto 3 posto 4 posto 5 posto 6 forte", ipanema: "posto 8 posto 9 posto 10",
    leblon: "posto 11 posto 12 baixo leblon", arpoador: "posto 7 pedra do arpoador", leme: "posto 1 pedra do leme",
    barra: "barra da tijuca quebra-mar pepe pepê jardim oceanico", saoconrado: "pepino asa delta", reserva: "reserva",
    recreio: "recreio dos bandeirantes macumba pontal", flamengo: "aterro", vermelha: "urca", itaipu: "camboinhas",
    icarai: "niteroi", diabo: "diabo", joatinga: "joa", grumari: "grumari", prainha: "prainha"
  };
  function buscarPraias(q) {
    q = semAcento(q.trim());
    if (!q) return [];
    return PRAIAS.map((p) => {
      const nome = semAcento(p.nome), extra = semAcento(`${p.local} ${APELIDOS[p.id] || ""}`);
      const pontos = nome.startsWith(q) ? 3 : (" " + nome).includes(" " + q) ? 2 : (" " + extra).includes(" " + q) ? 1 : 0;   // só começo de palavra
      return { p, pontos };
    }).filter((r) => r.pontos).sort((a, b) => b.pontos - a.pontos || a.p.nome.localeCompare(b.p.nome)).slice(0, 6).map((r) => r.p);
  }
  function abrirPraia(id) {
    const p = PRAIAS.find((x) => x.id === id);
    if (estado.regiao !== "todas" && estado.regiao !== p.regiao) irParaRegiao(p.regiao);
    $("#busca").value = ""; $("#buscaRes").hidden = true; $("#busca").blur();
    selecionar(id, true);
  }
  function ligarBusca() {
    const inp = $("#busca"), res = $("#buscaRes");
    if (!inp) return;
    const mostrar = () => {
      const achadas = buscarPraias(inp.value);
      if (!inp.value.trim()) { res.hidden = true; return; }
      res.innerHTML = achadas.length ? achadas.map((p) => {
        const l = linhas.find((q) => q.p.id === p.id);
        const ic = l ? `<span class="ic ${l.a.ceu}">${IC[l.a.ceu]}</span>` : "";
        return `<li role="option"><button data-id="${p.id}">${ic}<span><b>${p.nome}</b><small>${l ? l.a.resumo : p.local}</small></span></button></li>`;
      }).join("") : `<li class="vazio">Não achei essa praia. Tente outro nome.</li>`;
      res.hidden = false;
      res.querySelectorAll("button").forEach((b) => b.onclick = () => abrirPraia(b.dataset.id));
    };
    inp.addEventListener("input", mostrar);
    inp.addEventListener("focus", mostrar);
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { const p = buscarPraias(inp.value)[0]; if (p) abrirPraia(p.id); }
      if (e.key === "Escape") { inp.value = ""; res.hidden = true; }
    });
    document.addEventListener("click", (e) => { if (!e.target.closest(".busca")) res.hidden = true; });
  }

  // ---------- início ----------
  function controles() {
    ligarBusca();
    contarFavoritas();
    $("#abrirFav").onclick = abrirFavoritas;
    $("#abrirSurfe").onclick = abrirSurfe;
    $("#fecharRel").onclick = fecharRelatorio;
    $("#relTela").addEventListener("click", (e) => { if (e.target.id === "relTela") fecharRelatorio(); });
    ligarArrasteCartao();
    $("#fecharSurfe").onclick = fecharSurfe;
    $("#surfeVoltar").onclick = () => { surfeAberta = null; desenharSurfe(); };
    $("#fecharFav").onclick = fecharFavoritas;
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#favTela").hidden) fecharFavoritas(); if (e.key === "Escape" && !$("#surfeTela").hidden) fecharSurfe(); if (e.key === "Escape" && !$("#relTela").hidden) fecharRelatorio(); });
    $("#regioes").innerHTML = Object.entries(REGIOES).map(([k, v]) => `<button data-r="${k}" aria-pressed="${k === estado.regiao}">${v.nome}</button>`).join("");
    document.querySelectorAll("#regioes button").forEach((b) => b.onclick = () => irParaRegiao(b.dataset.r));
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const instalado = window.navigator.standalone || matchMedia("(display-mode: standalone)").matches;
    if (ios && !instalado && !guarda.ler("pm-instalar-fechado")) $("#instalar").hidden = false;
    $("#fecharInstalar").onclick = () => { $("#instalar").hidden = true; guarda.gravar("pm-instalar-fechado", true); };
  }

  async function iniciar() {
    controles();
    iniciarMapa().catch((e) => console.error("Mapa indisponível", e));
    try {
      balneab = await buscarJSON("data/balneabilidade.json").catch(() => ({ praias: {} }));
      const dados = await carregar();
      montar(dados);
      desenharDias();
      desenhar();
      const q = new Date(dados.t);
      $("#atualizado").textContent = "Previsão atualizada às " + hm(q) + ".";
    } catch (e) {
      console.error(e);
      $("#cartao").innerHTML = '<div class="aviso">Não consegui carregar a previsão agora. Verifique a internet e tente de novo.<br><button id="tentar">Tentar de novo</button></div>';
      $("#tentar").onclick = () => location.reload();
    }
  }

  // atualização automática: a cada 10 minutos com o app aberto, e ao voltar para o app depois de 10 minutos fora
  let ultimaBusca = Date.now(), buscando = false;
  async function atualizarPrevisao() {
    if (buscando || document.hidden || !linhas.length) return;
    buscando = true;
    try {
      const [dados, bal] = await Promise.all([carregar(true), buscarJSON("data/balneabilidade.json?t=" + Date.now()).catch(() => null)]);
      if (bal && bal.praias) balneab = bal;
      {
        montar(dados);
        desenharDias();
        desenhar();
        if (!$("#favTela").hidden) desenharFavoritas();
        // mapa de ondulação: marca como velho e recarrega se estiver aberto
        Object.keys(dadosOnd).forEach((g) => { delete dadosOnd[g]; ondVelho[g] = true; });
        campoCache = null;
        if (!$("#surfeTela").hidden) desenharSurfe();
        // relatório aberto: redesenha com os dados novos, no mesmo horário
        if (!$("#relTela").hidden && relAberto) {
          const ra = { ...relAberto }, l = linhas.find((q) => q.p.id === ra.id);
          if (l) { abrirRelatorio(ra.k, l); if (ra.min != null && $("#relSvg")) moverRel(ra.min); }
        }
        $("#atualizado").textContent = "Previsão atualizada às " + hm(new Date(dados.t)) + ".";
      }
      ultimaBusca = Date.now();
    } catch (e) { console.warn("Não consegui atualizar agora", e); }
    buscando = false;
  }
  setInterval(atualizarPrevisao, CACHE_MIN * 60000);
  // voltou para o app (outra aba, celular bloqueado, app em segundo plano): se passou 10 min, atualiza na hora
  const aoVoltar = () => { if (!document.hidden && Date.now() - ultimaBusca >= CACHE_MIN * 60000) atualizarPrevisao(); };
  document.addEventListener("visibilitychange", aoVoltar);
  window.addEventListener("pageshow", aoVoltar);
  window.addEventListener("focus", aoVoltar);
  // segurança extra: confere a cada minuto (o relógio do navegador pode atrasar com o app parado)
  setInterval(aoVoltar, 60000);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
  window.PRAIOMETRO = { analisar, sombraDoDia, cena };   // usado nos testes
  iniciar();
})();

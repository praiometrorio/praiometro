// Praiômetro Rio — lógica do site (versão 2: cartões, selos, caminho do sol e sombra)
(function () {
  "use strict";

  const PRAIAS = window.PRAIAS;
  const REGIOES = window.REGIOES;
  const SOL = window.SOL;
  const FUSO = "America/Sao_Paulo";
  const OFFSET = "-03:00";                     // o Brasil não tem mais horário de verão
  const HORA_INI = 6, HORA_FIM = 19;           // janela de praia considerada
  const CACHE_CHAVE = "pm-previsao-v3";
  const CACHE_MIN = 60;                        // minutos que a previsão fica guardada
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
    relogio: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')
  };

  // ---------- leitura do tempo ----------
  // Cada hora vira um "estado": sol, parcial (entre nuvens), nublado ou chuva
  const estadoHora = (chuva, nuvens) => chuva >= 50 ? "chuva" : nuvens >= 70 ? "nublado" : nuvens >= 35 ? "parcial" : "sol";

  // Maior sequência de horas seguidas (entre 7h e 18h) que satisfazem a condição
  function maiorSequencia(horas, cond) {
    let melhor = null, ini = null;
    const fim = (h) => { if (ini != null && (!melhor || h - ini > melhor.fim - melhor.ini)) melhor = { ini, fim: h }; ini = null; };
    for (let h = 7; h <= 18; h++) {
      const x = horas.find((y) => y.h === h);
      if (x && cond(x)) { if (ini == null) ini = h; } else fim(h);
    }
    fim(19);
    return melhor;
  }

  function analisar(x, p) {
    const dia = x.horas.filter((y) => y.h >= 7 && y.h <= 18);
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

    const uv = x.uv;
    if (uv >= 11) selos.push({ cls: "bronze", ic: IC.gota, t: "UV extremo", s: "Bronze rápido: foge do sol das 11h às 15h" });
    else if (uv >= 8) selos.push({ cls: "bronze", ic: IC.gota, t: "Dia de pegar cor", s: `UV ${uv} · protetor a cada 2h` });
    else if (uv >= 3 && horasSol >= 3) selos.push({ cls: "bronze", ic: IC.gota, t: "Sol gostoso", s: `UV ${uv} · passa protetor` });
    else if (uv >= 3) selos.push({ cls: "bronze", ic: IC.gota, t: "UV moderado", s: "Queima mesmo nublado" });
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
    if (x.vento <= 10) selos.push({ cls: "neutro", ic: IC.vento, t: "Vento fraco", s: "Dia de altinha" });
    else if (x.vento <= 15) selos.push({ cls: "neutro", ic: IC.vento, t: "Brisa", s: "Guarda-sol firme" });
    else if (x.vento <= 20) selos.push({ cls: "mexido", ic: IC.vento, t: "Pode ventar à tarde", s: "Finca bem o guarda-sol" });
    else selos.push({ cls: "ruim", ic: IC.vento, t: "Ventania", s: "Areia voando, guarda-sol indo embora" });

    if (x.propria === true) selos.push({ cls: "ok", ic: IC.escudoOk, t: "Água própria", s: "Boletim do INEA" });
    else if (x.propria === false) selos.push({ cls: "ruim", ic: IC.escudoX, t: "Água imprópria", s: "Evite entrar no mar" });
    else selos.push({ cls: "neutro", ic: IC.escudo, t: "Água limpa?", s: "Ainda sem boletim" });

    if (!p.baia && o != null && o >= 1 && o <= 2.4 && x.vento <= 15)
      selos.push({ cls: "mar", ic: IC.prancha, t: "Onda pra surfar", s: `${fmt(o)} m · vento ${x.vento} km/h` });

    // --- frase do dia ---
    let ceuTxt;
    if (ceu === "chuva") ceuTxt = pancada ? `Dia de chuva, a partir das ${pancada.h}h` : "Dia de chuva";
    else if (tam(janela) >= 5) ceuTxt = `Solzão das ${janela.ini}h às ${janela.fim}h`;
    else if (tam(janela) >= 2) ceuTxt = `Sol das ${janela.ini}h às ${janela.fim}h`;
    else if (tam(janelaParcial) >= 2) ceuTxt = "Sol entre nuvens";
    else ceuTxt = "Céu fechado o dia todo";

    const resto = [];
    const marTxt = p.baia ? "mar calminho" : o == null ? null : o < 0.6 ? "mar piscininha" : o < 1.2 ? "mar tranquilo" : o < 2 ? "mar mexido" : "mar pesado";
    if (marTxt) resto.push(marTxt);
    if (x.vento > 20) resto.push("ventania");
    else if (x.vento > 15) resto.push("vento apertando à tarde");
    if (x.propria === true) resto.push("água própria");
    if (x.propria === false) resto.push("água imprópria");

    const tom = (horasSol >= 5 && x.vento <= 15 && (p.baia || o == null || o < 1.6) && x.chuvaMax < 40 && x.propria !== false) ? "bom"
      : ((horasSol <= 1 && (ceu === "nublado" || ceu === "chuva")) || (ceu === "chuva" && x.chuvaMax >= 70)) ? "ruim" : "medio";
    const fecho = tom === "bom" ? "Dia de praia raiz." : tom === "ruim" ? "Melhor deixar a praia pra outro dia." : "Dá pra ir, de olho no céu.";
    const junta = (a) => a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " e " + a[a.length - 1];
    const chuvaTxt = ceu !== "chuva" && pancada ? `, mas pode cair uma pancada lá pelas ${pancada.h}h` : "";
    const veredito = (resto.length ? `${ceuTxt}, ${junta(resto)}` : ceuTxt) + chuvaTxt + ". " + fecho;

    const resumo = [ceu === "chuva" ? "Chuva" : tam(janela) >= 2 ? `Sol ${janela.ini}h–${janela.fim}h` : tam(janelaParcial) >= 2 ? "Entre nuvens" : "Nublado", marTxt ? marTxt.replace("mar ", "") : null,
      x.vento > 20 ? "ventania" : x.vento > 15 ? "vento à tarde" : null, x.propria === false ? "imprópria" : null].filter(Boolean).join(" · ");

    const score = horasSol * 2 + horasParcial * 0.5 - horasChuva - (x.vento > 20 ? 3 : x.vento > 15 ? 1 : 0) - (!p.baia && o != null && o > 1.6 ? 1.5 : 0) - (x.propria === false ? 5 : 0) + (p.baia ? 0 : 0.5) + (x.propria === true ? 0.5 : 0);
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
    "&hourly=temperature_2m,precipitation_probability,cloud_cover,wind_speed_10m" +
    "&daily=sunrise,sunset,uv_index_max&timezone=" + encodeURIComponent(FUSO) + "&forecast_days=7";
  // Nuvens: média de 9 modelos. No teste de set-out/2026 (Santos Dumont e Jacarepaguá)
  // a média acertou mais se ia ter sol do que qualquer modelo sozinho.
  const MODELOS_NUVEM = ["ecmwf_ifs025", "ecmwf_aifs025_single", "gfs_seamless", "icon_seamless", "meteofrance_seamless", "ukmo_seamless", "jma_seamless", "gem_seamless", "cma_grapes_global"];
  const urlNuvens = () => "https://api.open-meteo.com/v1/forecast?latitude=" + listaLat() + "&longitude=" + listaLon() +
    "&hourly=cloud_cover&models=" + MODELOS_NUVEM.join(",") + "&timezone=" + encodeURIComponent(FUSO) + "&forecast_days=7";
  const urlMar = () => "https://marine-api.open-meteo.com/v1/marine?latitude=" + listaLat() + "&longitude=" + listaLon() +
    "&hourly=wave_height,sea_surface_temperature&timezone=" + encodeURIComponent(FUSO) + "&forecast_days=7";

  async function buscarJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }
  async function carregar() {
    const cache = guarda.ler(CACHE_CHAVE);
    if (cache && Date.now() - cache.t < CACHE_MIN * 60000) return cache;
    const [tempo, mar, nuvens] = await Promise.all([buscarJSON(urlPrevisao()), buscarJSON(urlMar()).catch(() => null), buscarJSON(urlNuvens()).catch(() => null)]);
    const novo = { t: Date.now(), tempo, mar, nuvens };
    guarda.gravar(CACHE_CHAVE, novo);
    return novo;
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
      const nuvemMedia = {};
      if (N[i] && N[i].hourly) {
        const nh = N[i].hourly;
        nh.time.forEach((ts, k) => {
          const xs = MODELOS_NUVEM.map((md) => (nh["cloud_cover_" + md] || [])[k]).filter((v) => v != null);
          if (xs.length >= 3) nuvemMedia[ts] = media(xs);
        });
      }
      out[p.id] = datas.map((data, d) => {
        const idx = [];
        h.time.forEach((ts, k) => {
          const hr = +ts.slice(11, 13);
          if (ts.slice(0, 10) === data && hr >= HORA_INI && hr <= HORA_FIM) idx.push(k);
        });
        const val = (arr) => idx.map((k) => arr[k]).filter((v) => v != null);
        const temps = val(h.temperature_2m), chuvas = val(h.precipitation_probability), ventos = val(h.wind_speed_10m);
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
          vento: ventos.length ? Math.round(Math.max(...ventos)) : 0,
          uv: Math.round(t.daily.uv_index_max[d] || 0),
          ondas: ondas == null ? null : Math.round(ondas * 10) / 10,
          agua: aguaT == null ? null : Math.round(aguaT * 10) / 10,
          nascer: (t.daily.sunrise[d] || "").slice(11, 16) || "05:30",
          porDoSol: (t.daily.sunset[d] || "").slice(11, 16) || "18:30",
          propria: prop === true ? true : prop === false ? false : null,
          horas: idx.map((k) => {
            const chuva = h.precipitation_probability[k] || 0;
            const nuvens = Math.round(nuvemMedia[h.time[k]] ?? (h.cloud_cover[k] || 0));
            return { h: +h.time[k].slice(11, 13), t: Math.round(h.temperature_2m[k]), chuva, nuvens, est: estadoHora(chuva, nuvens) };
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
    const nomes = () => $("#mapa").classList.toggle("mostrar-nomes", mapa.getZoom() >= 12.4);
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
      mapaPronto = true;
      desenharSolNoMapa();
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
    for (let h = 7; h <= 18; h++) {
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
    const horas = [];
    for (let h = 7; h <= 18; h++) { const y = x.horas.find((q) => q.h === h); horas.push(`<i class="${y ? y.est : ""}" data-h="${h}" title="${h}h"></i>`); }

    $("#cartao").innerHTML = `
      <div class="cena${c.escura ? " escura" : ""}">${c.svg}
        <div class="tit">${melhor && a.tom !== "ruim" ? `<span class="badge">Melhor praia ${nomeDia(estado.dia)}</span>` : ""}<h2>${p.nome}</h2><span class="local">${p.local}</span></div>
      </div>
      <div class="corpo">
        <p class="veredito">${a.veredito}</p>
        <div class="selos">${a.selos.map((s) => `<div class="selo ${s.cls}">${s.ic}<b>${s.t}</b><span>${s.s}</span></div>`).join("")}</div>
        <div class="faixa">
          <p class="rotulo">Sol ao longo do dia</p>
          <div class="horas" id="horas">${horas.join("")}</div>
          <div class="horasleg"><span>7h</span><span>12h</span><span>18h</span></div>
          <div class="chaves"><span><i style="background:#FFB627"></i>Sol</span><span><i style="background:#FFE7B3"></i>Entre nuvens</span><span><i style="background:#C9D3DA"></i>Nublado</span><span><i style="background:#8FA9C4"></i>Chuva</span><span><i style="background:repeating-linear-gradient(135deg,#8C9AA5 0 3px,#E7EEF3 3px 6px)"></i>Areia na sombra</span></div>
        </div>
        <div class="info sombra" id="sombra">${IC.sombra}<span>Calculando a sombra na areia…</span></div>
        <div class="relogio">
          <label for="minuto"><span>${IC.relogio.replace("<svg", '<svg width="18" height="18" style="vertical-align:-4px;margin-right:4px"')}Onde está o sol às <b id="minutoTxt">${textoMin(estado.minuto)}</b></span><span id="minutoSit"></span></label>
          <input type="range" id="minuto" min="${ini}" max="${fim}" step="5" value="${estado.minuto}">
          <small>Arraste para ver o sol andando no mapa</small>
        </div>
        <div class="info por">${IC.porDoSol}<span><b>Pôr do sol às ${x.porDoSol.replace(":", "h")}</b>, ${porTxt}${p.porDoSol ? ". Vista clássica daqui" : ""}.</span></div>
      </div>`;
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
    el.querySelector("span").innerHTML = r.texto + (st === "erro" ? " <small>(sem dados do relevo agora; considerei só os prédios)</small>" : "");
    document.querySelectorAll("#horas i").forEach((i) => i.classList.toggle("sombra", r.sombraHora[+i.dataset.h]));
    atualizarSituacao();
  }

  function desenharSolNoMapa(soAgora) {
    if (!mapaPronto || !linhas.length) return;
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

  function desenharLista() {
    if (!linhas.length) return;
    const atual = praiaAtual();
    const ord = linhas.slice().sort((a, b) => b.a.score - a.a.score);
    const vis = estado.regiao === "todas" ? ord : ord.filter((l) => l.p.regiao === estado.regiao);
    $("#listaTitulo").textContent = "Praias " + nomeDia(estado.dia) + (estado.regiao === "todas" ? "" : " · " + REGIOES[estado.regiao].nome);
    $("#lista").innerHTML = vis.map((l) => `<li><button data-id="${l.p.id}" aria-current="${l.p.id === atual.p.id}">
      <span class="ic ${l.a.ceu}">${IC[l.a.ceu]}</span>
      <span class="nm"><b>${l.p.nome}</b><span>${l.a.resumo}</span></span>
      <span class="hs">${l.a.horasSol}h de sol</span></button></li>`).join("");
    document.querySelectorAll("#lista button").forEach((b) => b.onclick = () => selecionar(b.dataset.id, true));
  }

  // ---------- início ----------
  function controles() {
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

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
  window.PRAIOMETRO = { analisar, sombraDoDia, cena };   // usado nos testes
  iniciar();
})();

// Câmera do sol: abre a câmera e desenha por cima o caminho do sol no céu (realidade aumentada).
// Usa a bússola e o sensor de inclinação do celular para saber para onde a câmera aponta.
(function () {
  const RAD = Math.PI / 180;
  const FOV_LONGO = 64;            // ângulo de visão da câmera traseira no lado maior da imagem (graus, aproximado)
  const FUSO = "-03:00";
  let depurar = false;
  let el, video, canvas, ctx, stream = null, praia = null, rodando = false;
  let alphaRaw = null, beta = 0, gamma = 0, correcaoBussola = null, ajusteUsuario = 0, temBussola = false;
  let caminho = [], horas = [], nascer = null, por = null;

  const pad = (n) => String(n).padStart(2, "0");
  const hojeISO = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const quando = (data, min) => new Date(`${data}T${pad(Math.floor(min / 60))}:${pad(min % 60)}:00${FUSO}`);
  const ang = (a) => ((a % 360) + 360) % 360;
  const DIRS = ["norte", "nordeste", "leste", "sudeste", "sul", "sudoeste", "oeste", "noroeste"];

  // ---------- caminho do sol de hoje, de 5 em 5 minutos ----------
  function calcular() {
    const d = hojeISO();
    caminho = []; horas = []; nascer = por = null;
    let antes = null;
    for (let m = 4 * 60; m <= 20 * 60; m += 5) {
      const s = SOL.posicao(quando(d, m), praia.lat, praia.lon);
      const pt = { m, az: s.az, alt: s.alt };
      // nascer e pôr: quando o topo do sol cruza o horizonte (-0,83° por causa da refração), interpolando o minuto
      const H0 = -0.833;
      const cruza = (a, b) => { const k = (H0 - a.alt) / (b.alt - a.alt); return { m: Math.round(a.m + 5 * k), az: a.az + (b.az - a.az) * k, alt: 0 }; };
      if (antes && antes.alt < H0 && s.alt >= H0) nascer = cruza(antes, pt);
      if (antes && antes.alt >= H0 && s.alt < H0) por = cruza(antes, pt);
      if (s.alt > -2) caminho.push(pt);
      if (m % 60 === 0 && s.alt > 0) horas.push(pt);
      antes = pt;
    }
  }

  // ---------- orientação do celular ----------
  // Matriz que leva as coordenadas do celular (x direita, y topo, z para fora da tela)
  // para as da Terra (x leste, y norte, z para cima). Convenção da W3C (Z-X'-Y'').
  function matriz(alpha, be = beta, ga = gamma) {
    const a = alpha * RAD, b = be * RAD, g = ga * RAD;
    const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cg = Math.cos(g), sg = Math.sin(g);
    let R = [
      [ca * cg - sa * sb * sg, -cb * sa, ca * sg + cg * sa * sb],
      [cg * sa + ca * sb * sg, ca * cb, sa * sg - ca * cg * sb],
      [-cb * sg, sb, cb * cg]
    ];
    // celular deitado (paisagem): gira a tela
    const giro = ((screen.orientation && screen.orientation.angle) || window.orientation || 0) * RAD;
    if (giro) {
      const c = Math.cos(giro), s = Math.sin(giro);
      R = R.map((l) => [l[0] * c + l[1] * s, -l[0] * s + l[1] * c, l[2]]);
    }
    return R;
  }
  const rumoDaCamera = (R) => ang(Math.atan2(-R[0][2], -R[1][2]) / RAD);    // para onde aponta a traseira

  function alphaAbsoluto() {
    if (alphaRaw == null) return null;
    return alphaRaw + (correcaoBussola || 0) - ajusteUsuario;
  }

  // Para não "perder" o desenho quando a câmera aponta para cima:
  // - o giro do celular vem do giroscópio (estável em qualquer posição);
  // - a bússola só serve para dizer onde fica o norte, e só é lida com a câmera perto do horizonte
  //   (apontando para o alto a bússola do celular fica maluca). Com a câmera para cima, a correção congela.
  let ultimoRelativo = 0;
  const elevacaoCamera = (R) => Math.asin(Math.max(-1, Math.min(1, -R[2][2]))) / RAD;
  // A bússola só vale com a câmera perto do horizonte (até 25° para cima ou para baixo).
  // Mais inclinado que isso, o iPhone troca a referência da bússola e ela chega a virar 180°.
  let ultimaBussola = null, foraSeguidas = 0;
  function corrigirNorte(rumoVerdadeiro) {
    if (alphaRaw == null) return;
    ultimaBussola = rumoVerdadeiro;
    const R = matriz(alphaRaw);
    if (Math.abs(elevacaoCamera(R)) > 25) return;                                // inclinado: não confia, congela
    const dif = ang(rumoDaCamera(R) - rumoVerdadeiro + 180) - 180;              // quanto girar o alpha
    if (correcaoBussola == null) { correcaoBussola = dif; temBussola = true; return; }
    const delta = ang(dif - correcaoBussola + 180) - 180;
    // um salto grande de uma vez é leitura ruim (ferro, eletrônico perto); só aceita se repetir por um tempo
    if (Math.abs(delta) > 35 && ++foraSeguidas < 40) return;
    foraSeguidas = 0;
    correcaoBussola += delta * 0.06;
    temBussola = true;
  }
  function aoGirarRel(e) {
    if (e.alpha == null) return;
    if (e.absolute === true && typeof e.webkitCompassHeading !== "number") return aoGirarAbs(e);
    alphaRaw = e.alpha; beta = e.beta || 0; gamma = e.gamma || 0; ultimoRelativo = Date.now();
    // iPhone: a bússola vem junto, à parte
    if (typeof e.webkitCompassHeading === "number" && e.webkitCompassHeading >= 0) corrigirNorte(e.webkitCompassHeading);
  }
  function aoGirarAbs(e) {
    if (e.alpha == null) return;
    const rumo = rumoDaCamera(matriz(e.alpha, e.beta || 0, e.gamma || 0));
    if (Date.now() - ultimoRelativo > 500) {
      // sem giroscópio separado: usa a orientação absoluta direto
      alphaRaw = e.alpha; beta = e.beta || 0; gamma = e.gamma || 0;
      const R = matriz(alphaRaw);
      if (correcaoBussola == null || Math.abs(elevacaoCamera(R)) <= 45) correcaoBussola = 0;
      temBussola = true;
    } else corrigirNorte(rumo);
  }

  // ---------- projeção na tela ----------
  function vetor(az, alt) {
    return [Math.sin(az * RAD) * Math.cos(alt * RAD), Math.cos(az * RAD) * Math.cos(alt * RAD), Math.sin(alt * RAD)];
  }
  function focal() {
    const W = canvas.width, H = canvas.height;
    const vw = video.videoWidth || 1080, vh = video.videoHeight || 1920;
    const escala = Math.max(W / vw, H / vh);                  // a imagem cobre a tela toda (corta as bordas)
    return (Math.max(vw, vh) / 2) / Math.tan((FOV_LONGO / 2) * RAD) * escala;
  }
  function projetar(R, v, f) {
    // Terra -> celular: transposta de R
    const x = R[0][0] * v[0] + R[1][0] * v[1] + R[2][0] * v[2];
    const y = R[0][1] * v[0] + R[1][1] * v[1] + R[2][1] * v[2];
    const z = R[0][2] * v[0] + R[1][2] * v[1] + R[2][2] * v[2];
    if (z > -0.05) return { atras: true, x, y };
    return { x: canvas.width / 2 + f * x / -z, y: canvas.height / 2 - f * y / -z };
  }

  // ---------- desenho ----------
  function desenhar() {
    if (!rodando) return;
    requestAnimationFrame(desenhar);
    const dpr = window.devicePixelRatio || 1;
    const W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    ctx.clearRect(0, 0, W, H);
    const aA = alphaAbsoluto();
    const dica = el.querySelector(".ceu-dica");
    if (aA == null) { dica.textContent = "Mexa o celular devagar para ligar a bússola…"; return; }
    if (correcaoBussola == null && typeof window.DeviceOrientationEvent !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent)) {
      dica.textContent = "Aponte a câmera para o horizonte por 1 segundo para achar o norte…"; return;
    }
    const R = suavizar(matriz(aA)), f = focal(), u = dpr;
    if (depurar) el.querySelector(".ceu-dep").textContent = `β ${beta.toFixed(0)} γ ${gamma.toFixed(0)} α ${alphaRaw.toFixed(0)} · câmera ${elevacaoCamera(R).toFixed(0)}° · bússola ${ultimaBussola == null ? "-" : ultimaBussola.toFixed(0)} · correção ${(correcaoBussola || 0).toFixed(0)}`;

    // linha do horizonte
    ctx.setLineDash([8 * u, 8 * u]); ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1.5 * u;
    ctx.beginPath(); let ok = false;
    for (let az = 0; az <= 360; az += 3) {
      const p = projetar(R, vetor(az, 0), f);
      if (p.atras) { ok = false; continue; }
      ok ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); ok = true;
    }
    ctx.stroke(); ctx.setLineDash([]);

    // caminho do sol
    ctx.lineWidth = 4 * u; ctx.strokeStyle = "rgba(255,182,39,.95)"; ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 6 * u;
    ctx.beginPath(); ok = false;
    for (const pt of caminho) {
      const p = projetar(R, vetor(pt.az, pt.alt), f);
      if (p.atras) { ok = false; continue; }
      ok ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); ok = true;
    }
    ctx.stroke(); ctx.shadowBlur = 0;

    // horas
    ctx.font = `700 ${14 * u}px Figtree, system-ui, sans-serif`; ctx.textAlign = "center";
    for (const pt of horas) {
      const p = projetar(R, vetor(pt.az, pt.alt), f);
      if (p.atras || p.x < -50 || p.x > W + 50 || p.y < -50 || p.y > H + 50) continue;
      ctx.fillStyle = "#FFB627"; ctx.beginPath(); ctx.arc(p.x, p.y, 6 * u, 0, 7); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2 * u; ctx.stroke();
      rotulo(`${pt.m / 60}h`, p.x, p.y - 14 * u, u);
    }

    // nascer e pôr do sol
    if (nascer) marco(R, f, nascer, `Nasce ${hm(nascer.m)}`, u);
    if (por) marco(R, f, por, `🌅 Pôr do sol ${hm(por.m)}`, u);

    // sol agora
    const agora = new Date();
    const s = SOL.posicao(agora, praia.lat, praia.lon);
    const p = projetar(R, vetor(s.az, s.alt), f);
    const naTela = !p.atras && p.x > 0 && p.x < W && p.y > 0 && p.y < H;
    if (naTela && s.alt > -1) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 40 * u);
      g.addColorStop(0, "rgba(255,214,90,.95)"); g.addColorStop(.45, "rgba(255,182,39,.6)"); g.addColorStop(1, "rgba(255,182,39,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 40 * u, 0, 7); ctx.fill();
      ctx.fillStyle = "#FFD65A"; ctx.beginPath(); ctx.arc(p.x, p.y, 14 * u, 0, 7); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 3 * u; ctx.stroke();
      rotulo("Sol agora", p.x, p.y + 34 * u, u);
    } else if (s.alt > -1) {
      seta(p, u);
    }

    // texto de baixo
    const rumo = rumoDaCamera(R);
    const sit = s.alt < -1 ? "O sol já se pôs. A linha mostra o caminho de hoje." :
      naTela ? "Toque no sol de verdade para acertar o desenho." : "Siga a seta para achar o sol.";
    const onde = Math.abs(elevacaoCamera(R)) > 60 ? "Olhando para o alto" : `Olhando para o ${DIRS[Math.round(rumo / 45) % 8]}`;
    dica.textContent = `${onde} · ${sit}`;
  }
  // Suaviza a tremedeira dos sensores: média com o quadro anterior e reajusta os eixos
  let Rsuave = null;
  function suavizar(R) {
    if (!Rsuave) { Rsuave = R; return R; }
    const k = 0.35;
    const c = [0, 1, 2].map((j) => [0, 1, 2].map((i) => Rsuave[i][j] * (1 - k) + R[i][j] * k));   // colunas
    const norm = (v) => { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const x = norm(c[0]); let y = c[1].map((v, i) => v - dot(c[1], x) * x[i]); y = norm(y);
    const z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
    Rsuave = [0, 1, 2].map((i) => [x[i], y[i], z[i]]);
    return Rsuave;
  }
  const hm = (m) => `${Math.floor(m / 60)}h${pad(m % 60)}`;

  function rotulo(t, x, y, u) {
    ctx.font = `700 ${14 * u}px Figtree, system-ui, sans-serif`;
    const w = ctx.measureText(t).width + 14 * u;
    ctx.fillStyle = "rgba(16,40,58,.75)";
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x - w / 2, y - 16 * u, w, 22 * u, 11 * u); ctx.fill(); }
    else ctx.fillRect(x - w / 2, y - 16 * u, w, 22 * u);
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(t, x, y);
  }
  function marco(R, f, pt, t, u) {
    const p = projetar(R, vetor(pt.az, 0), f);
    if (p.atras) return;
    ctx.fillStyle = "#FF7A3D"; ctx.beginPath(); ctx.arc(p.x, p.y, 8 * u, 0, 7); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2 * u; ctx.stroke();
    rotulo(t, p.x, p.y - 18 * u, u);
  }
  function seta(p, u) {
    // direção do sol na tela (mesmo se estiver atrás de você)
    let dx = p.atras ? p.x : p.x - canvas.width / 2, dy = p.atras ? -p.y : p.y - canvas.height / 2;
    const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
    const cx = canvas.width / 2 + dx * canvas.width * 0.36, cy = canvas.height / 2 + dy * canvas.height * 0.36;
    const a = Math.atan2(dy, dx);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
    ctx.fillStyle = "#FFB627"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3 * u;
    ctx.beginPath(); ctx.moveTo(26 * u, 0); ctx.lineTo(-14 * u, -18 * u); ctx.lineTo(-6 * u, 0); ctx.lineTo(-14 * u, 18 * u); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.restore();
    rotulo("☀️ O sol está pra lá", cx, cy + 44 * u, u);
  }

  // Toque no sol de verdade: corrige o erro da bússola (só o giro para os lados)
  function aoTocar(ev) {
    if (alphaRawnull()) return;
    const t = ev.touches ? ev.touches[0] : ev;
    const dpr = window.devicePixelRatio || 1;
    const R = matriz(alphaAbsoluto()), f = focal();
    const px = t.clientX * dpr - canvas.width / 2, py = -(t.clientY * dpr - canvas.height / 2);
    // direção do ponto tocado, nas coordenadas da Terra
    const d = [px / f, py / f, -1];
    const v = [R[0][0] * d[0] + R[0][1] * d[1] + R[0][2] * d[2], R[1][0] * d[0] + R[1][1] * d[1] + R[1][2] * d[2]];
    const azToque = ang(Math.atan2(v[0], v[1]) / RAD);
    const s = SOL.posicao(new Date(), praia.lat, praia.lon);
    if (s.alt < 0) return;
    const dif = ang(azToque - s.az + 180) - 180;
    if (Math.abs(dif) > 60) return;                      // toque longe demais: ignora
    ajusteUsuario -= dif;                                   // gira o desenho para o sol cair onde você tocou
    el.querySelector(".ceu-ok").hidden = false;
    setTimeout(() => { const o = el.querySelector(".ceu-ok"); if (o) o.hidden = true; }, 1800);
  }
  const alphaRawnull = () => alphaRaw == null;

  // ---------- abrir e fechar ----------
  async function abrir(p) {
    praia = p; ajusteUsuario = 0; correcaoBussola = null; alphaRaw = null; temBussola = false; Rsuave = null; ultimoRelativo = 0; ultimaBussola = null; foraSeguidas = 0;
    calcular();
    if (!el) montar();
    el.querySelector(".ceu-nome").textContent = p.nome;
    el.querySelector(".ceu-dica").textContent = "Abrindo a câmera…";
    el.hidden = false; document.body.style.overflow = "hidden";
    // permissão dos sensores (iPhone pede, e precisa ser logo depois do toque)
    try {
      if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === "function") {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== "granted" && /iphone|ipad|ipod/i.test(navigator.userAgent)) { erro("Sem a permissão de movimento não dá para saber para onde o celular aponta. Feche e tente de novo, tocando em Permitir."); return; }
      }
    } catch (e) {}
    window.addEventListener("deviceorientationabsolute", aoGirarAbs, true);
    window.addEventListener("deviceorientation", aoGirarRel, true);
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      video.srcObject = stream; await video.play().catch(() => {});
    } catch (e) {
      erro("Não consegui abrir a câmera. Libere a câmera para o Praiômetro nas configurações do celular.");
      return;
    }
    rodando = true; requestAnimationFrame(desenhar);
    setTimeout(() => { if (rodando && !temBussola) el.querySelector(".ceu-dica").textContent = "Não achei a bússola deste celular. Sem ela o desenho pode sair no lugar errado."; }, 4000);
  }

  function erro(t) { el.querySelector(".ceu-dica").textContent = t; }

  function fechar() {
    rodando = false;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    window.removeEventListener("deviceorientationabsolute", aoGirarAbs, true);
    window.removeEventListener("deviceorientation", aoGirarRel, true);
    ultimoRelativo = 0; Rsuave = null;
    el.hidden = true; document.body.style.overflow = "";
  }

  function montar() {
    el = document.createElement("div");
    el.className = "ceu"; el.hidden = true;
    el.innerHTML = `<video playsinline muted autoplay></video><canvas></canvas>
      <div class="ceu-topo"><div><b>Sol no céu</b><span class="ceu-nome"></span></div><button class="ceu-x" aria-label="Fechar">×</button></div>
      <div class="ceu-dep" hidden></div>
      <div class="ceu-ok" hidden>Pronto, acertei o desenho ☀️</div>
      <div class="ceu-dica"></div>`;
    document.body.appendChild(el);
    video = el.querySelector("video"); canvas = el.querySelector("canvas"); ctx = canvas.getContext("2d");
    el.querySelector(".ceu-x").onclick = fechar;
    // modo de teste: tocar 3 vezes no título mostra os números dos sensores
    let toques = 0;
    el.querySelector(".ceu-topo b").onclick = () => { if (++toques >= 3) { depurar = !depurar; toques = 0; el.querySelector(".ceu-dep").hidden = !depurar; } };
    canvas.addEventListener("click", aoTocar);
  }

  // só faz sentido em celular com câmera e sensores
  const suportado = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.DeviceOrientationEvent) &&
    matchMedia("(pointer: coarse)").matches;

  window.CEU = { abrir, fechar, suportado, _teste: { matriz, projetar, rumoDaCamera, set: (a, b, g) => { alphaRaw = a; beta = b; gamma = g; correcaoBussola = 0; } } };
})();

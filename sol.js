// Praiômetro Rio — posição do sol e sombra na areia.
// Calcula onde o sol está (altura e direção) para qualquer praia e horário,
// e se a areia está no sol ou na sombra do morro ou dos prédios.
(function () {
  "use strict";
  const RAD = Math.PI / 180;

  // Posição do sol: alt = altura acima do horizonte (graus), az = direção (graus, 0 = norte, 90 = leste)
  function posicao(data, lat, lon) {
    const n = data.getTime() / 86400000 + 2440587.5 - 2451545.0;
    const L = (280.460 + 0.9856474 * n) % 360;
    const g = ((357.528 + 0.9856003 * n) % 360) * RAD;
    const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * RAD;
    const eps = (23.439 - 0.0000004 * n) * RAD;
    const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
    const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
    const gmst = (280.46061837 + 360.98564736629 * n) % 360;
    const H = ((gmst + lon) * RAD) - ra;
    const la = lat * RAD;
    const alt = Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(H));
    let az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(la) - Math.tan(dec) * Math.cos(la)) / RAD + 180;
    az = ((az % 360) + 360) % 360;
    return { alt: alt / RAD, az };
  }

  // Ponto a "km" quilômetros da praia na direção "az" (para desenhar no mapa)
  function destino(lat, lon, az, km) {
    const dLat = (km * Math.cos(az * RAD)) / 111.32;
    const dLon = (km * Math.sin(az * RAD)) / (111.32 * Math.cos(lat * RAD));
    return [lon + dLon, lat + dLat];
  }

  // ---------- relevo (morros) ----------
  // Para cada direção (de 10 em 10 graus), pega a altitude do terreno em vários pontos
  // até 6 km de distância e guarda o ângulo do ponto mais "alto" visto da areia.
  const DIRECOES = 36;                                       // 0, 10, 20 ... 350 graus
  const DISTANCIAS = [0.25, 0.4, 0.6, 0.9, 1.3, 1.8, 2.5, 3.4, 4.6, 6.0]; // km
  const OLHO = 3;                                            // altura de quem está na areia (m)

  function pontosHorizonte(p) {
    const pts = [];
    for (let i = 0; i < DIRECOES; i++) {
      for (const d of DISTANCIAS) pts.push(destino(p.lat, p.lon, i * 10, d));
    }
    return pts;
  }

  function anguloHorizonte(elevacoes) {
    const ang = [];
    let k = 0;
    for (let i = 0; i < DIRECOES; i++) {
      let max = 0;
      for (const d of DISTANCIAS) {
        const e = elevacoes[k++];
        if (e == null) continue;
        const queda = (d * d) / (2 * 6371) * 1000;          // curvatura da Terra (m)
        const a = Math.atan((e - OLHO - queda) / (d * 1000)) / RAD;
        if (a > max) max = a;
      }
      ang.push(Math.round(max * 10) / 10);
    }
    return ang;
  }

  function horizonteEm(ang, az) {
    const x = (((az % 360) + 360) % 360) / 10;
    const i = Math.floor(x) % DIRECOES, j = (i + 1) % DIRECOES, f = x - Math.floor(x);
    return ang[i] * (1 - f) + ang[j] * f;
  }

  // ---------- prédios da orla (estimativa) ----------
  // predios = { altura (m), dist (m da areia até a fachada), terra (direção do lado da cidade, graus) }
  function anguloPredios(pr, az) {
    if (!pr) return 0;
    let delta = Math.abs(((az - pr.terra + 540) % 360) - 180);
    if (delta > 75) return 0;
    const dist = pr.dist / Math.cos(delta * RAD);
    return Math.atan(pr.altura / dist) / RAD;
  }

  // O que está tapando o sol? null = sol na areia; "morro", "predios" ou "noite"
  function bloqueio(sol, horizonte, predios) {
    if (sol.alt <= 0) return "noite";
    const m = horizonte ? horizonteEm(horizonte, sol.az) : 0;
    const pr = anguloPredios(predios, sol.az);
    if (sol.alt < Math.max(m, pr)) return pr > m ? "predios" : "morro";
    return null;
  }

  window.SOL = { posicao, destino, pontosHorizonte, anguloHorizonte, horizonteEm, anguloPredios, bloqueio };
})();

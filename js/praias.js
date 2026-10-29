// Lista das praias do Praiômetro.
// lat/lon = ponto no meio da areia (usado no mapa, na previsão e no cálculo de sombra).
// regiao: zs = Zona Sul, zo = Zona Oeste, nit = Niterói
// baia: praia dentro da Baía de Guanabara (mar calmo, previsão de ondas não se aplica)
// selvagem: praia mais isolada, com mar mais forte
// porDoSol: lugar clássico para ver o pôr do sol
// mar: direção para onde a praia está virada (para o surfe: de onde a onda chega de frente e qual vento é terral)
// predios: estimativa dos prédios da orla que fazem sombra na areia
//   altura = altura média (m), dist = distância da areia até os prédios (m),
//   terra = direção do lado da cidade, em graus (0 = norte, 90 = leste, 180 = sul, 270 = oeste)
window.PRAIAS = [
  { id: "flamengo",    nome: "Flamengo",            regiao: "zs",  local: "Zona Sul · Baía de Guanabara",        lat: -22.9318, lon: -43.1716, mar: 100, baia: true },
  { id: "botafogo",    nome: "Botafogo",            regiao: "zs",  local: "Zona Sul · Baía de Guanabara",        lat: -22.9457, lon: -43.1797, mar: 40, baia: true, predios: { altura: 35, dist: 90, terra: 225 } },
  { id: "vermelha",    nome: "Praia Vermelha",      regiao: "zs",  local: "Zona Sul · Urca",                     lat: -22.9555, lon: -43.1645, mar: 115 },
  { id: "leme",        nome: "Leme",                regiao: "zs",  local: "Zona Sul",                            lat: -22.9631, lon: -43.1680, mar: 150, predios: { altura: 33, dist: 100, terra: 300 } },
  { id: "copacabana",  nome: "Copacabana",          regiao: "zs",  local: "Zona Sul",                            lat: -22.9711, lon: -43.1822, mar: 145, predios: { altura: 36, dist: 100, terra: 315 } },
  { id: "arpoador",    nome: "Arpoador",            regiao: "zs",  local: "Zona Sul",                            lat: -22.9887, lon: -43.1922, mar: 170, porDoSol: true },
  { id: "diabo",       nome: "Praia do Diabo",      regiao: "zs",  local: "Zona Sul · entre o Arpoador e o Forte", lat: -22.9895, lon: -43.1907, mar: 120, selvagem: true },
  { id: "ipanema",     nome: "Ipanema",             regiao: "zs",  local: "Zona Sul",                            lat: -22.9868, lon: -43.2050, mar: 175, predios: { altura: 30, dist: 95, terra: 355 } },
  { id: "leblon",      nome: "Leblon",              regiao: "zs",  local: "Zona Sul",                            lat: -22.9873, lon: -43.2230, mar: 180, predios: { altura: 30, dist: 95, terra: 350 } },
  { id: "vidigal",     nome: "Vidigal",             regiao: "zs",  local: "Zona Sul · ao pé do Dois Irmãos",     lat: -22.9922, lon: -43.2319, mar: 195 },
  { id: "saoconrado",  nome: "São Conrado",         regiao: "zo",  local: "Zona Sul · ao pé da Pedra da Gávea",  lat: -22.9995, lon: -43.2680, mar: 175 },
  { id: "joatinga",    nome: "Joatinga",            regiao: "zo",  local: "Zona Oeste · Joá, acesso por escadaria", lat: -23.0149, lon: -43.2902, mar: 190, selvagem: true, porDoSol: true },
  { id: "barra",       nome: "Barra da Tijuca",     regiao: "zo",  local: "Zona Oeste · Postos 1 a 6",           lat: -23.0112, lon: -43.3320, mar: 170, predios: { altura: 35, dist: 130, terra: 345 } },
  { id: "reserva",     nome: "Reserva",             regiao: "zo",  local: "Zona Oeste · Postos 7 a 9",           lat: -23.0130, lon: -43.3950, mar: 170 },
  { id: "recreio",     nome: "Recreio",             regiao: "zo",  local: "Zona Oeste",                          lat: -23.0260, lon: -43.4630, mar: 170 },
  { id: "prainha",     nome: "Prainha",             regiao: "zo",  local: "Zona Oeste · Parque Natural",         lat: -23.0410, lon: -43.5060, mar: 150, selvagem: true },
  { id: "grumari",     nome: "Grumari",             regiao: "zo",  local: "Zona Oeste · Área de proteção",       lat: -23.0480, lon: -43.5250, mar: 165, selvagem: true },
  { id: "icarai",      nome: "Icaraí",              regiao: "nit", local: "Niterói · Baía de Guanabara",         lat: -22.9060, lon: -43.1080, mar: 200, baia: true, porDoSol: true, predios: { altura: 45, dist: 90, terra: 45 } },
  { id: "piratininga", nome: "Piratininga",         regiao: "nit", local: "Niterói · Região Oceânica",           lat: -22.9560, lon: -43.0900, mar: 175 },
  { id: "itaipu",      nome: "Camboinhas e Itaipu", regiao: "nit", local: "Niterói · Região Oceânica",           lat: -22.9660, lon: -43.0530, mar: 180 },
  { id: "itacoatiara", nome: "Itacoatiara",         regiao: "nit", local: "Niterói · Região Oceânica",           lat: -22.9760, lon: -43.0280, mar: 160, selvagem: true }
];

// Enquadramento do mapa para cada região: [oeste, sul, leste, norte]
window.REGIOES = {
  todas: { nome: "Tudo",       caixa: [-43.54, -23.06, -43.01, -22.89] },
  zs:    { nome: "Zona Sul",   caixa: [-43.235, -22.995, -43.155, -22.925] },
  zo:    { nome: "Zona Oeste", caixa: [-43.535, -23.055, -43.26, -22.99] },
  nit:   { nome: "Niterói",    caixa: [-43.12, -22.985, -43.02, -22.895] }
};

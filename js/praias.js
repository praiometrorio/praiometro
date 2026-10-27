// Lista das praias do Praiômetro.
// lat/lon = ponto central da praia (usado no mapa e na previsão).
// regiao: zs = Zona Sul, zo = Zona Oeste, nit = Niterói
// baia: praia dentro da Baía de Guanabara (mar calmo, previsão de ondas não se aplica)
// selvagem: praia mais isolada, com mar mais forte
// porDoSol: lugar clássico para ver o pôr do sol
window.PRAIAS = [
  { id: "flamengo",    nome: "Flamengo",            regiao: "zs",  local: "Zona Sul · Baía de Guanabara",        lat: -22.9318, lon: -43.1716, baia: true },
  { id: "botafogo",    nome: "Botafogo",            regiao: "zs",  local: "Zona Sul · Baía de Guanabara",        lat: -22.9457, lon: -43.1797, baia: true },
  { id: "vermelha",    nome: "Praia Vermelha",      regiao: "zs",  local: "Zona Sul · Urca",                     lat: -22.9555, lon: -43.1645 },
  { id: "leme",        nome: "Leme",                regiao: "zs",  local: "Zona Sul",                            lat: -22.9631, lon: -43.1680 },
  { id: "copacabana",  nome: "Copacabana",          regiao: "zs",  local: "Zona Sul",                            lat: -22.9711, lon: -43.1822 },
  { id: "arpoador",    nome: "Arpoador",            regiao: "zs",  local: "Zona Sul",                            lat: -22.9887, lon: -43.1922, porDoSol: true },
  { id: "ipanema",     nome: "Ipanema",             regiao: "zs",  local: "Zona Sul",                            lat: -22.9868, lon: -43.2050 },
  { id: "leblon",      nome: "Leblon",              regiao: "zs",  local: "Zona Sul",                            lat: -22.9873, lon: -43.2230 },
  { id: "saoconrado",  nome: "São Conrado",         regiao: "zo",  local: "Zona Sul · ao pé da Pedra da Gávea",  lat: -22.9995, lon: -43.2680 },
  { id: "barra",       nome: "Barra da Tijuca",     regiao: "zo",  local: "Zona Oeste · Postos 1 a 6",           lat: -23.0112, lon: -43.3320 },
  { id: "reserva",     nome: "Reserva",             regiao: "zo",  local: "Zona Oeste · Postos 7 a 9",           lat: -23.0130, lon: -43.3950 },
  { id: "recreio",     nome: "Recreio",             regiao: "zo",  local: "Zona Oeste",                          lat: -23.0260, lon: -43.4630 },
  { id: "prainha",     nome: "Prainha",             regiao: "zo",  local: "Zona Oeste · Parque Natural",         lat: -23.0410, lon: -43.5060, selvagem: true },
  { id: "grumari",     nome: "Grumari",             regiao: "zo",  local: "Zona Oeste · Área de proteção",       lat: -23.0480, lon: -43.5250, selvagem: true },
  { id: "icarai",      nome: "Icaraí",              regiao: "nit", local: "Niterói · Baía de Guanabara",         lat: -22.9060, lon: -43.1080, baia: true, porDoSol: true },
  { id: "piratininga", nome: "Piratininga",         regiao: "nit", local: "Niterói · Região Oceânica",           lat: -22.9560, lon: -43.0900 },
  { id: "itaipu",      nome: "Camboinhas e Itaipu", regiao: "nit", local: "Niterói · Região Oceânica",           lat: -22.9660, lon: -43.0530 },
  { id: "itacoatiara", nome: "Itacoatiara",         regiao: "nit", local: "Niterói · Região Oceânica",           lat: -22.9760, lon: -43.0280, selvagem: true }
];

// Enquadramento do mapa para cada região: [oeste, sul, leste, norte]
window.REGIOES = {
  todas: { nome: "Tudo",       caixa: [-43.54, -23.06, -43.01, -22.89] },
  zs:    { nome: "Zona Sul",   caixa: [-43.235, -22.995, -43.155, -22.925] },
  zo:    { nome: "Zona Oeste", caixa: [-43.535, -23.055, -43.26, -22.99] },
  nit:   { nome: "Niterói",    caixa: [-43.12, -22.985, -43.02, -22.895] }
};

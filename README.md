# Praiômetro Rio

A nota de cada praia do Rio e de Niterói, num mapa: chuva, UV, vento, ondas, temperatura da água, balneabilidade e pôr do sol, hora a hora.

## Como funciona

- Site estático (HTML, CSS e JavaScript), sem servidor próprio.
- Mapa: MapLibre com mapas do OpenFreeMap (dados do OpenStreetMap).
- Previsão do tempo e do mar: Open-Meteo.
- Balneabilidade: arquivo `data/balneabilidade.json`, atualizado a partir dos boletins do INEA.
- Pode ser instalado no celular como app (PWA).

## Arquivos

- `index.html`: estrutura da página
- `css/estilo.css`: visual
- `js/praias.js`: lista de praias, coordenadas e regiões
- `js/app.js`: busca da previsão, cálculo das notas, mapa e telas
- `data/balneabilidade.json`: praias próprias e impróprias
- `manifest.webmanifest`, `sw.js`, `icons/`: instalação como app

## Próximos passos

- Alertas de "praião" por notificação
- Atualização automática da balneabilidade
- Plano comercial da Open-Meteo antes de monetizar

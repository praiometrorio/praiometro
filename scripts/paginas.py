# Gera a página de cada praia (v19.0): praiometrorio.com.br/ipanema, /leblon, ...
# Cada página é pequenininha: tem o título e a imagem de prévia da praia (para o WhatsApp, o Instagram e o Google)
# e manda a pessoa direto para o app já aberto naquela praia (/?praia=ipanema).
# Também gera o sitemap.xml e o robots.txt. Rodar de novo só quando a lista de praias (js/praias.js) mudar:
#   python scripts/paginas.py
import os, re, html

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SITE = "https://praiometrorio.com.br"

txt = open(os.path.join(RAIZ, "js", "praias.js"), encoding="utf-8").read()
txt = txt[:txt.index("window.REGIOES")]
praias = re.findall(r'\{\s*id:\s*"([a-z]+)".*?nome:\s*"([^"]+)".*?local:\s*"([^"]+)"', txt)

MODELO = """<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{nome} hoje: vai dar praia? · Praiômetro Rio</title>
  <meta name="description" content="Sol, mar, vento, água e sombra na areia em {nome} ({local}), hora a hora.">
  <link rel="canonical" href="{site}/{id}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Praiômetro Rio">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:url" content="{site}/{id}">
  <meta property="og:title" content="{nome}: vai dar praia? · Praiômetro">
  <meta property="og:description" content="Sol, mar, vento e água em {nome}, hora a hora.">
  <meta property="og:image" content="{site}/icons/og/{id}.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#0E4C7A">
  <link rel="icon" href="/icons/icon-192.png?v=3" type="image/png">
  <meta http-equiv="refresh" content="0;url=/?praia={id}">
  <script>location.replace("/?praia={id}" + location.hash);</script>
  <style>body{{margin:0;min-height:100vh;display:grid;place-content:center;background:#0E4C7A;color:#fff;font:600 17px system-ui,sans-serif;text-align:center}}a{{color:#7CD3F7}}</style>
</head>
<body>
  <p>Abrindo {nome} no Praiômetro…<br><a href="/?praia={id}">Toque aqui se não abrir</a></p>
</body>
</html>
"""

for pid, nome, local in praias:
    os.makedirs(os.path.join(RAIZ, pid), exist_ok=True)
    open(os.path.join(RAIZ, pid, "index.html"), "w", encoding="utf-8").write(
        MODELO.format(id=pid, nome=html.escape(nome), local=html.escape(local), site=SITE))

urls = [SITE + "/"] + [f"{SITE}/{p[0]}" for p in praias] + [SITE + "/privacidade.html"]
open(os.path.join(RAIZ, "sitemap.xml"), "w", encoding="utf-8").write(
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    "".join(f"  <url><loc>{u}</loc></url>\n" for u in urls) + "</urlset>\n")
open(os.path.join(RAIZ, "robots.txt"), "w", encoding="utf-8").write(f"User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n")
print(len(praias), "páginas de praia geradas:", ", ".join(p[0] for p in praias))

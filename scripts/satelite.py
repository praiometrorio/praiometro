# Robô do satélite (FASE DE CALIBRAÇÃO): anota o brilho da imagem "visível" do satélite GOES-19
# (NASA GIBS, camada GOES-East_ABI_Band2_Red_Visible_1km, ~1 km, nova a cada 10 min, ~35 min de atraso)
# em cima dos aeroportos e de cada praia. Junto com o que o aeroporto observou (observado.json),
# isso vai mostrar qual brilho = céu limpo / poucas nuvens / nublado, conforme a hora do dia.
# Anota [brilho ~3 km, brilho ~9 km, textura] (o app usa nas horas que já passaram) e a cor do infravermelho ("_ir", calibração).
# Guarda os últimos 14 dias em data/satelite.json.
import json, os, re, io, sys, math, datetime, urllib.request
from PIL import Image

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
ARQ = os.path.join(RAIZ, "data", "satelite.json")
CAMADA = "GOES-East_ABI_Band2_Red_Visible_1km"
Z = 7
BR = datetime.timezone(datetime.timedelta(hours=-3))
AEROPORTOS = {"SBRJ": (-22.9105, -43.1631), "SBJR": (-22.9875, -43.3700), "SBGL": (-22.8090, -43.2506)}

def praias():
    txt = open(os.path.join(RAIZ, "js", "praias.js"), encoding="utf-8").read()
    return {m.group(1): (float(m.group(2)), float(m.group(3)))
            for m in re.finditer(r'id:\s*"([^"]+)".*?lat:\s*(-?[\d.]+),\s*lon:\s*(-?[\d.]+)', txt)}

def pos(lat, lon):
    import math
    n = 2 ** Z; xf = (lon + 180) / 360 * n; lr = math.radians(lat)
    yf = (1 - math.log(math.tan(lr) + 1 / math.cos(lr)) / math.pi) / 2 * n
    return int(xf), int(yf), int((xf - int(xf)) * 256), int((yf - int(yf)) * 256)

def tile(t, x, y, cache={}):
    k = (t, x, y)
    if k in cache: return cache[k]
    url = f"https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{CAMADA}/default/{t}/GoogleMapsCompatible_Level7/{Z}/{y}/{x}.png"
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Praiometro"}), timeout=40) as r:
            im = Image.open(io.BytesIO(r.read())).convert("L")
    except Exception as e:
        print("sem imagem", t, x, y, e); im = None
    cache[k] = im
    return im

def brilho(im, px, py, r):
    """média do brilho (0-255) num quadrado de (2r+1) x (2r+1) pixels (~1,1 km cada)"""
    v = [im.getpixel((min(255, max(0, px + dx)), min(255, max(0, py + dy)))) for dy in range(-r, r + 1) for dx in range(-r, r + 1)]
    return round(sum(v) / len(v), 1)

IR_CACHE = {}
dados = json.load(open(ARQ)) if os.path.exists(ARQ) else {}
try: obs = json.load(open(os.path.join(RAIZ, "data", "observado.json"))).get("estacoes", {})
except Exception: obs = {}
dados.setdefault("leituras", {})
pontos = {**AEROPORTOS, **praias()}
agora = datetime.datetime.now(datetime.timezone.utc)
novos = 0
# imagens dos últimos ~80 min (de 10 em 10), só de dia (6h às 19h de Brasília) e só as que ainda não foram anotadas
for atras in range(30, 81, 10):
    t0 = agora - datetime.timedelta(minutes=atras); t0 = t0.replace(minute=t0.minute - t0.minute % 10, second=0, microsecond=0)
    local = t0.astimezone(BR)
    if not (6 <= local.hour <= 19): continue
    t = t0.strftime("%Y-%m-%dT%H:%M:%SZ"); chave = local.strftime("%Y-%m-%dT%H:%M")
    if chave in dados["leituras"]: continue
    lido = {}
    for nome, (la, lo) in pontos.items():
        x, y, px, py = pos(la, lo); im = tile(t, x, y)
        if im is None: break
        b1, b4 = brilho(im, px, py, 1), brilho(im, px, py, 4)
        if b4 == 0: im = None; break          # imagem ainda vazia (não chegou)
        # textura: desvio-padrão do brilho no quadrado de ~9 km. Liso = véu uniforme (mormaço); manchado = nuvens soltas
        vs = [im.getpixel((min(255, max(0, px + dx)), min(255, max(0, py + dy)))) for dy in range(-4, 5) for dx in range(-4, 5)]
        md = sum(vs) / len(vs); tex = round((sum((v - md) ** 2 for v in vs) / len(vs)) ** 0.5, 1)
        lido[nome] = [b1, b4, tex]            # [brilho ~3 km, brilho ~9 km, textura ~9 km]
    # INFRAVERMELHO (banda 13, ~2 km): mostra a temperatura do topo da nuvem (cinza = quente/baixa; colorido = topo muito frio/alto).
    # Fase de calibração: só anota a cor do pixel [R, G, B] em cada ponto, para depois aprendermos a separar cirro fino de nuvem
    # grossa e a ver o céu com o sol baixo (quando a imagem visível não serve). Se a imagem não existir, segue sem ela.
    ir = {}
    try:
        for nome, (la, lo) in pontos.items():
            n6 = 2 ** 6; xf = (lo + 180) / 360 * n6; lr = math.radians(la)
            yf = (1 - math.log(math.tan(lr) + 1 / math.cos(lr)) / math.pi) / 2 * n6
            k = ("ir", t, int(xf), int(yf))
            if k not in IR_CACHE:
                url = f"https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GOES-East_ABI_Band13_Clean_Infrared/default/{t}/GoogleMapsCompatible_Level6/6/{int(yf)}/{int(xf)}.png"
                with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Praiometro"}), timeout=40) as r:
                    IR_CACHE[k] = Image.open(io.BytesIO(r.read())).convert("RGB")
            ir[nome] = list(IR_CACHE[k].getpixel((int((xf - int(xf)) * 256), int((yf - int(yf)) * 256))))
    except Exception as e:
        print("sem infravermelho", t, e); ir = {}
    if lido and len(lido) == len(pontos):
        if ir: lido["_ir"] = ir
        # junta o que o aeroporto viu na hora cheia mais próxima (o METAR sai na hora cheia)
        hc = (local + datetime.timedelta(minutes=30)).strftime("%Y-%m-%dT%H")
        lido["_aeroporto"] = {e: obs.get(e, {}).get(hc) for e in AEROPORTOS if obs.get(e, {}).get(hc)}
        dados["leituras"][chave] = lido; novos += 1; print("anotado", chave)

# guarda só os últimos 14 dias
corte = (agora - datetime.timedelta(days=14)).astimezone(BR).strftime("%Y-%m-%dT%H:%M")
dados["leituras"] = {k: v for k, v in sorted(dados["leituras"].items()) if k >= corte}
dados["_comoFunciona"] = ("Brilho (0-255) da imagem visível do satélite GOES-19 (NASA GIBS) em cima de cada ponto: "
                          "[média ~3 km, média ~9 km]. Fase de calibração: comparar com observado.json.")
dados["atualizadoEm"] = agora.astimezone(BR).strftime("%Y-%m-%dT%H:%M")
if novos:
    json.dump(dados, open(ARQ, "w"), ensure_ascii=False, separators=(",", ":"))
print("novas leituras:", novos)

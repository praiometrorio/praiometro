# Placar da chuva: até quantas horas o RADAR acerta mais que os 9 MODELOS? (v18.3)
# A cada rodada (15 min), para cada um dos 33 pluviômetros do Alerta Rio, o robô anota o que cada método diz que vai
# acontecer na hora seguinte, daqui a 2 h e daqui a 3 h. Quando a hora fecha, confere com a chuva MEDIDA no pluviômetro
# (data/chuva.json, "horas") e soma no placar. Nada disso muda o app: é só medição, para depois calibrar a passagem
# radar -> modelos com número de verdade, não com chute.
#
# Métodos comparados (choveu = 0,2 mm ou mais no pluviômetro naquela hora):
#   radar    = mancha do radar empurrada pelo movimento (mesma conta do app, v17.6); chove se a chuva passa em cima da estação
#   parado   = radar sem movimento: se está chovendo em cima da estação agora, "vai continuar" (referência simples)
#   pluv     = o pluviômetro está medindo chuva agora -> vai continuar (persistência)
#   modelos  = % dos 9 modelos com 0,3 mm ou mais naquela hora; conta como "chove" a partir de 50%
# Placar por hora de antecedência: a = acertou chuva, b = alarme falso, c = chuva que não previu, d = acertou seco.
# CSI = a / (a + b + c): 1 = perfeito, 0 = nunca acerta chuva. Para os modelos guarda também o Brier (erro da %).
import json, os, sys, math, time, datetime, urllib.request, io

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
ARQ_CHUVA = os.path.join(RAIZ, "data", "chuva.json")
ARQ = os.path.join(RAIZ, "data", "placar_chuva.json")
BR = datetime.timezone(datetime.timedelta(hours=-3))
MODELOS = ["ecmwf_ifs025", "ecmwf_aifs025_single", "gfs_seamless", "icon_seamless", "meteofrance_seamless",
           "ukmo_seamless", "jma_seamless", "gem_seamless", "cma_grapes_global"]
CHUVA_MM_MODELO = 0.3      # igual ao app
CHOVEU_MM = 0.2            # menor leitura do pluviômetro
METODOS = ["radar", "parado", "pluv", "modelos"]
LEADS = ["1h", "2h", "3h"]  # hora seguinte, daqui a 2 h, daqui a 3 h
Z = 7

def baixar(url, binario=False, tentativas=3):
    for t in range(tentativas):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 Praiometro"}), timeout=40) as r:
                b = r.read()
                return b if binario else json.loads(b)
        except Exception as e:
            print("falhou", url[:90], "->", e); time.sleep(5 * (t + 1))
    return None

def pos(lat, lon):
    n = 2 ** Z; xf = (lon + 180) / 360 * n; lr = math.radians(lat)
    yf = (1 - math.log(math.tan(lr) + 1 / math.cos(lr)) / math.pi) / 2 * n
    return int(xf), int(yf), int((xf - int(xf)) * 256), int((yf - int(yf)) * 256)

def mascara(png):
    """força da chuva por pixel, igual ao app: alfa < 200 = nada; vermelho forte = 3 (forte); resto = 2 (chuva)"""
    from PIL import Image
    im = Image.open(io.BytesIO(png)).convert("RGBA"); d = im.load()
    return [[(0 if d[x, y][3] < 200 else 3 if d[x, y][0] >= 200 else 2) for x in range(256)] for y in range(256)]

def movimento(ms, tempos):
    """deslocamento em pixels por 10 min que melhor encaixa uma imagem na seguinte (IoU, até 12 px), igual ao app"""
    pts = []
    for m in ms:
        a = [(x, y) for y in range(256) for x in range(256) if m[y][x]]
        if len(a) > 1500: passo = len(a) / 1500; a = [a[int(k * passo)] for k in range(1500)]
        pts.append(a)
    vs = []
    for k in range(len(ms) - 1):
        A, B, nB = pts[k], ms[k + 1], len(pts[k + 1])
        if len(A) < 30 or nB < 30: continue
        melhor = None
        for dy in range(-12, 13):
            for dx in range(-12, 13):
                inter = sum(1 for (x, y) in A if 0 <= x + dx < 256 and 0 <= y + dy < 256 and B[y + dy][x + dx])
                nota = inter / (len(A) + min(nB, len(A)) - inter)
                if not melhor or nota > melhor[0]: melhor = (nota, dx, dy)
        passos = max(1, round((tempos[k + 1] - tempos[k]) / 600))
        if melhor and melhor[0] >= 0.2: vs.append((melhor[1] / passos, melhor[2] / passos))
    if not vs: return None
    return (sum(v[0] for v in vs) / len(vs), sum(v[1] for v in vs) / len(vs))

def chove_em(m, cx, cy):
    """chuva em cima do ponto: 2 ou mais dos 9 pixels em volta (~3 km), igual ao "aqui" do app. None = fora da imagem"""
    if cx < 1 or cy < 1 or cx > 254 or cy > 254: return None
    return sum(1 for dy in (-1, 0, 1) for dx in (-1, 0, 1) if m[cy + dy][cx + dx]) >= 2

def prever_radar(est, agora):
    """{nome: {hora: (radar, parado)}} para as 3 próximas horas cheias. None se o radar está velho ou fora do ar"""
    mapa = baixar("https://api.rainviewer.com/public/weather-maps.json")
    past = (mapa or {}).get("radar", {}).get("past", [])
    if not past: print("radar fora do ar"); return None
    qs = past[-3:]; t0 = qs[-1]["time"]
    if agora.timestamp() - t0 > 40 * 60: print("imagem do radar velha demais"); return None
    tiles = {}
    def tile(x, y, q):
        k = (x, y, q["path"])
        if k not in tiles:
            png = baixar(f"{mapa['host']}{q['path']}/256/{Z}/{x}/{y}/2/0_0.png", binario=True)
            tiles[k] = mascara(png) if png else None
        return tiles[k]
    x0, y0, _, _ = pos(-22.97, -43.25)
    ms = [tile(x0, y0, q) for q in qs]
    mov = movimento([m for m in ms if m], [q["time"] for q, m in zip(qs, ms) if m]) if all(ms) else None
    print("movimento da chuva (px por 10 min):", mov)
    horas = [(agora.replace(minute=0, second=0, microsecond=0) + datetime.timedelta(hours=k)) for k in (1, 2, 3)]
    out = {}
    for nome, e in est.items():
        x, y, px, py = pos(e["lat"], e["lon"])
        m = ms[-1] if (x, y) == (x0, y0) else tile(x, y, qs[-1])
        if not m: continue
        agora_chove = chove_em(m, px, py)
        prev = {}
        for H in horas:
            vistos = []
            for L in range(0, 181, 10):
                t = datetime.datetime.fromtimestamp(t0 + L * 60, BR)
                if not (H <= t < H + datetime.timedelta(hours=1)): continue
                if mov is None: continue
                v = chove_em(m, round(px - mov[0] * L / 10), round(py - mov[1] * L / 10))
                if v is not None: vistos.append(v)
            prev[H.strftime("%Y-%m-%dT%H")] = (any(vistos) if vistos else None, agora_chove)
        out[nome] = prev
    return out

def prever_modelos(est, agora):
    """{nome: {hora: % dos 9 modelos com chuva}}"""
    nomes = list(est)
    url = ("https://api.open-meteo.com/v1/forecast?latitude=" + ",".join(str(est[n]["lat"]) for n in nomes) +
           "&longitude=" + ",".join(str(est[n]["lon"]) for n in nomes) + "&hourly=precipitation&models=" + ",".join(MODELOS) +
           "&timezone=America%2FSao_Paulo&forecast_days=2")
    r = baixar(url)
    if not r: return {}
    r = r if isinstance(r, list) else [r]
    out = {}
    for nome, d in zip(nomes, r):
        h = d.get("hourly", {}); ts = h.get("time", []); out[nome] = {}
        for i, t in enumerate(ts):
            vs = [h.get(f"precipitation_{m}", [None] * len(ts))[i] for m in MODELOS]
            vs = [v for v in vs if v is not None]
            if len(vs) >= 3: out[nome][t[:13]] = round(100 * sum(1 for v in vs if v >= CHUVA_MM_MODELO) / len(vs))
    return out

def vazio(): return {l: {m: [0, 0, 0, 0] for m in METODOS} | {"brier": [0.0, 0]} for l in LEADS}

def somar(pl, lead, metodo, previu, choveu):
    if previu is None: return
    i = 0 if previu and choveu else 1 if previu else 2 if choveu else 3
    pl[lead][metodo][i] += 1

if __name__ == "__main__":
    agora = datetime.datetime.now(BR)
    chuva = json.load(open(ARQ_CHUVA, encoding="utf-8")) if os.path.exists(ARQ_CHUVA) else {}
    est = chuva.get("agora", {})
    medido = chuva.get("horas", {})
    if len(est) < 5: print("sem pluviômetros: nada a fazer"); sys.exit(0)
    dados = json.load(open(ARQ, encoding="utf-8")) if os.path.exists(ARQ) else {}
    pend = dados.get("pendentes", {}); dias = dados.get("dias", {})

    # 1) confere o que já pode ser conferido (hora fechada e medida)
    for H in sorted(list(pend)):
        if H in medido:
            dia = dias.setdefault(H[:10], vazio())
            for lead, nome, radar, parado, pluv, mod in pend.pop(H):
                mm = medido[H].get(nome)
                if mm is None: continue
                choveu = mm >= CHOVEU_MM
                somar(dia, lead, "radar", radar, choveu); somar(dia, lead, "parado", parado, choveu)
                somar(dia, lead, "pluv", pluv, choveu)
                if mod is not None:
                    somar(dia, lead, "modelos", mod >= 50, choveu)
                    dia[lead]["brier"][0] += (mod / 100 - (1 if choveu else 0)) ** 2; dia[lead]["brier"][1] += 1
        elif H < (agora - datetime.timedelta(hours=8)).strftime("%Y-%m-%dT%H"):
            pend.pop(H)       # a hora não foi medida (pluviômetros fora do ar): descarta

    # 2) anota as previsões desta rodada para as 3 próximas horas
    rad = prever_radar(est, agora) or {}
    mod = prever_modelos(est, agora)
    horas = [(agora.replace(minute=0, second=0, microsecond=0) + datetime.timedelta(hours=k)).strftime("%Y-%m-%dT%H") for k in (1, 2, 3)]
    for lead, H in zip(LEADS, horas):
        for nome, e in est.items():
            r = rad.get(nome, {}).get(H, (None, None))
            pluv = bool(e.get("m15", 0) > 0 or e.get("h01", 0) >= CHOVEU_MM)
            pend.setdefault(H, []).append([lead, nome, r[0], r[1], pluv, mod.get(nome, {}).get(H)])

    # 3) resumo dos últimos 30 dias, já com o CSI de cada método (é o que a gente vai olhar)
    corte = (agora - datetime.timedelta(days=30)).strftime("%Y-%m-%d")
    dias = {k: v for k, v in sorted(dias.items()) if k >= corte}
    tot = vazio()
    for v in dias.values():
        for l in LEADS:
            for m in METODOS: tot[l][m] = [a + b for a, b in zip(tot[l][m], v[l][m])]
            tot[l]["brier"] = [tot[l]["brier"][0] + v[l]["brier"][0], tot[l]["brier"][1] + v[l]["brier"][1]]
    resumo = {}
    for l in LEADS:
        resumo[l] = {}
        for m in METODOS:
            a, b, c, d = tot[l][m]
            resumo[l][m] = {"CSI": round(a / (a + b + c), 2) if a + b + c else None, "horasComChuva": a + c, "casos": a + b + c + d}
        bs = tot[l]["brier"]; resumo[l]["modelos"]["Brier"] = round(bs[0] / bs[1], 3) if bs[1] else None
    dados = {"_comoFunciona": "Placar da chuva: previsto (radar, radar parado, pluviômetro agora, 9 modelos) x medido nos pluviômetros, "
                              "por hora de antecedência. CSI = acertos de chuva / (acertos + alarmes falsos + chuvas não previstas).",
             "atualizadoEm": agora.strftime("%Y-%m-%dT%H:%M"), "resumo30dias": resumo, "dias": dias, "pendentes": pend}
    json.dump(dados, open(ARQ, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("placar:", json.dumps(resumo, ensure_ascii=False))

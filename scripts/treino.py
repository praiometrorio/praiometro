# Robô do aviso do Treino cedo.
# Todo fim de tarde olha a previsão de AMANHÃ das 5h às 9h e, para cada combinação esporte + praia + hora,
# agenda uma notificação para as 20h30 só para quem marcou esse dia da semana no app.
# Os treinos de cada pessoa ficam como etiquetas no OneSignal (o app grava), uma por treino:
#   nome "tr_esporte_praia_hora" (ex.: "tr_beach_ipanema_6"), valor = dias da semana somados como bits
#   (seg = 1, ter = 2, qua = 4, qui = 8, sex = 16, sáb = 32, dom = 64; ex.: seg+qua+sex = 21)
# Os limites e as contas são OS MESMOS do app (js/app.js: ESPORTES, notaTreino, bulbo). Se mudar lá, mude aqui.
import json, os, time, datetime, urllib.request, urllib.parse
from praiao import PRAIAS as PRAIAS_MAR, MODELOS, FUSO, SITE, baixar
# todas as praias do app (as de mar aberto do praião + as da baía): treino dá em qualquer uma
PRAIAS = PRAIAS_MAR + [
  ("flamengo", "Flamengo", -22.9318, -43.1716), ("botafogo", "Botafogo", -22.9457, -43.1797), ("icarai", "Icaraí", -22.9060, -43.1080),
]

ESPORTES = {   # [bom até, atrapalha até] em km/h (vento médio); acima disso é ruim
    "beach":   ("Beach tennis", "🎾", (7, 13)),
    "volei":   ("vôlei", "🏐", (8, 15)),
    "futev":   ("futevôlei", "⚽", (12, 20)),
    "altinha": ("altinha", "🦶", (10, 18)),
    "fresco":  ("frescobol", "🏖️", (12, 20)),
    "corrida": ("corrida", "🏃", (25, 35)),
    "natacao": ("natação", "🏊", (15, 22)),   # natação: vento só faz marola; o que manda são as ondas (ONDAS_NATACAO)
}
ONDAS_NATACAO = (0.6, 1.0)   # m na praia: bom até / atrapalha até (igual ao app)
# para onde cada praia está virada pras ondas (graus) e se é de baía — igual a js/praias.js (mar / ondaDe / baia)
ORIENTACAO = {'flamengo': (100, True), 'botafogo': (40, True), 'vermelha': (115, False), 'leme': (150, False), 'copacabana': (145, False), 'arpoador': (205, False), 'diabo': (120, False), 'ipanema': (175, False), 'leblon': (180, False), 'vidigal': (195, False), 'saoconrado': (175, False), 'joatinga': (190, False), 'barra': (170, False), 'reserva': (170, False), 'recreio': (170, False), 'prainha': (150, False), 'grumari': (165, False), 'icarai': (200, True), 'piratininga': (175, False), 'itaipu': (180, False), 'itacoatiara': (160, False)}

def expo_onda(pid, d):
    """quanto da onda chega na praia: inteira de frente, menor de lado (igual ao app: expoOnda)"""
    import math
    f = ORIENTACAO.get(pid, (None, False))[0]
    if d is None or f is None: return 1
    dd = abs((((d - f) % 360) + 540) % 360 - 180); x = max(0, dd - 20)
    return 0.15 if x >= 85 else max(0.15, math.cos(math.radians(x)))

def onda_praia(pid, mh, k):
    """altura do mar na praia (igual ao app: ondaPraia)"""
    g = lambda n: (mh.get(n) or [None] * (k + 1))[k]
    tot = g("wave_height")
    if tot is None: return None
    partes = [(g(a), g(d)) for a, d in (("swell_wave_height", "swell_wave_direction"), ("secondary_swell_wave_height", "secondary_swell_wave_direction"), ("wind_wave_height", "wind_wave_direction"))]
    partes = [(a, d) for a, d in partes if a is not None and a > 0]
    if partes:
        e0 = sum(a * a for a, _ in partes); e1 = sum((a * expo_onda(pid, d)) ** 2 for a, d in partes)
        o = tot * (e1 / e0) ** 0.5
    else: o = tot * expo_onda(pid, g("wave_direction"))
    return min(o, 0.5) if ORIENTACAO.get(pid, (None, False))[1] else o
HORAS = [5, 6, 7, 8, 9]
AVISO = "Lembrando: vento e previsão mudam bastante. Confere de novo amanhã cedo no app."

def previsao():
    lat = ",".join(str(p[2]) for p in PRAIAS); lon = ",".join(str(p[3]) for p in PRAIAS)
    base = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&timezone={urllib.parse.quote(FUSO)}&forecast_days=3"
    tempo = baixar(base + "&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m,wind_gusts_10m")
    try: mods = baixar(base + "&hourly=wind_speed_10m,precipitation&models=" + ",".join(MODELOS))
    except Exception: mods = None
    try: mar = baixar(f"https://marine-api.open-meteo.com/v1/marine?latitude={lat}&longitude={lon}&timezone={urllib.parse.quote(FUSO)}&forecast_days=3"
        "&hourly=wave_height,wave_direction,swell_wave_height,swell_wave_direction,secondary_swell_wave_height,secondary_swell_wave_direction,wind_wave_height,wind_wave_direction,sea_surface_temperature")
    except Exception: mar = None
    if isinstance(tempo, dict): tempo = [tempo]
    if isinstance(mods, dict): mods = [mods]
    if isinstance(mar, dict): mar = [mar]
    return tempo, mods, mar

def balneabilidade():
    """último boletim do INEA (o mesmo arquivo que o app lê): pid -> True/False/None"""
    try:
        d = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "balneabilidade.json"), encoding="utf-8"))
        return {k: (v.get("propria") if isinstance(v, dict) else v) for k, v in d.get("praias", {}).items()}
    except Exception: return {}

def mediana(xs):
    xs = sorted(xs); n = len(xs)
    return xs[(n - 1) // 2] if n % 2 else (xs[n // 2 - 1] + xs[n // 2]) / 2

def hora_a_hora(t, m, data, mar=None, pid=None, propria=None):
    """vento = mediana dos 9 modelos; rajada = proporção rajada/vento do modelo padrão aplicada ao vento (igual ao app)"""
    h = t["hourly"]; out = {}
    for hr in HORAS:
        ts = f"{data}T{hr:02d}:00"
        if ts not in h["time"]: continue
        k = h["time"].index(ts)
        v = None; chuva = h["precipitation_probability"][k] or 0
        if m:
            mh = m["hourly"]
            if ts in mh["time"]:
                km = mh["time"].index(ts)
                vs = [mh.get("wind_speed_10m_" + md, [None] * len(mh["time"]))[km] for md in MODELOS]
                vs = [x for x in vs if x is not None]
                if len(vs) >= 3: v = mediana(vs)
                # chance de chuva = % dos 9 modelos com 0,3 mm ou mais na hora (igual ao app)
                ps = [x for x in (mh.get("precipitation_" + md, [None] * len(mh["time"]))[km] for md in MODELOS) if x is not None]
                if len(ps) >= 3: chuva = round(100 * sum(1 for x in ps if x >= 0.3) / len(ps))
        if v is None: v = h["wind_speed_10m"][k]
        v = None if v is None else round(v)
        g, vb = h["wind_gusts_10m"][k], h["wind_speed_10m"][k]
        raj = None
        if v is not None and g is not None:
            f = min(2.2, max(1.1, g / vb)) if vb and vb > 3 else 1.5
            raj = max(v + 1, round(v * f))
        o = s = None
        if mar and ts in mar["hourly"]["time"]:
            km = mar["hourly"]["time"].index(ts); o = onda_praia(pid, mar["hourly"], km)
            s = (mar["hourly"].get("sea_surface_temperature") or [None] * (km + 1))[km]
        out[hr] = {"v": v, "raj": raj, "chuva": chuva,
                   "t": h["temperature_2m"][k], "ur": h["relative_humidity_2m"][k],
                   "o": None if o is None else round(o, 1), "s": s, "propria": propria}
    return out

def bulbo(t, ur):
    """WBGT na sombra = 0,7 × bulbo úmido (fórmula de Stull) + 0,3 × temperatura; igual ao app"""
    import math
    if t is None: return None
    if ur is None: return t - 2.8
    tw = (t * math.atan(0.151977 * math.sqrt(ur + 8.313659)) + math.atan(t + ur) - math.atan(ur - 1.676331)
          + 0.00391838 * ur ** 1.5 * math.atan(0.023101 * ur) - 4.686035)
    return 0.7 * tw + 0.3 * t

def nota(q, esp):
    lim = ESPORTES[esp][2]; n = 0; motivos = []
    if esp == "natacao":   # igual ao app: nadar na chuva não estraga; pesa o mar
        if q["chuva"] >= 50: n = 1; motivos.append("chuva")
        if q.get("o") is not None:
            no = 0 if q["o"] <= ONDAS_NATACAO[0] else 1 if q["o"] <= ONDAS_NATACAO[1] else 2
            if no: motivos.append("ondas grandes" if no == 2 else "mar mexido")
            n = max(n, no)
        if q["v"] is not None and q["v"] > lim[0]:
            nv = 2 if q["v"] > lim[1] else 1; motivos.append("vento forte" if nv == 2 else "marola do vento"); n = max(n, nv)
        if q.get("propria") is False: n = max(n, 1); motivos.append("água imprópria")
        if q.get("s") is not None and q["s"] < 19: n = max(n, 1); motivos.append("água gelada")
        return n, motivos
    if q["chuva"] >= 50: n = 2; motivos.append("chuva")
    elif q["chuva"] >= 30: n = 1; motivos.append("chance de chuva")
    if esp == "corrida":
        w = bulbo(q["t"], q["ur"])
        if w is not None and w >= 28: n = 2; motivos.append("calor perigoso")
        elif w is not None and w >= 23: n = max(n, 1); motivos.append("abafado")
        if q["v"] is not None and q["v"] > lim[1]: n = max(n, 1); motivos.append("vento forte")
    elif q["v"] is not None:
        nv = 0 if q["v"] <= lim[0] else 1 if q["v"] <= lim[1] else 2
        if q["raj"] is not None and q["raj"] >= lim[1] + 10 and nv < 2: nv += 1
        if nv: motivos.append("vento forte" if nv == 2 else "vento")
        n = max(n, nv)
    return n, motivos

def mensagem(esp, nome_praia, hr, q):
    nome, ic, _ = ESPORTES[esp]; n, motivos = nota(q, esp)
    oque = "a corrida" if esp == "corrida" else "a natação" if esp == "natacao" else ("o " + nome) if esp in ("volei", "futev", "fresco") else ("a " + nome) if esp == "altinha" else "o beach tennis"
    if n == 0: titulo = f"{ic} Amanhã {hr}h tá bom pr{oque[0]} {oque[2:]}!"
    elif n == 1:
        frase = {"vento": "o vento", "vento forte": "o vento forte", "chance de chuva": "a chance de chuva", "abafado": "o abafado",
                 "chuva": "a chuva", "mar mexido": "o mar mexido", "marola do vento": "a marola do vento", "água imprópria": "a água imprópria", "água gelada": "a água gelada"}
        titulo = f"{ic} Amanhã {hr}h dá, mas {' e '.join(frase.get(x, x) for x in motivos)} {'podem' if len(motivos) > 1 else 'pode'} atrapalhar"
    else: titulo = f"{'🌊' if 'ondas grandes' in motivos else '🌧️' if 'chuva' in motivos else '💨' if 'vento' in ' '.join(motivos) else '🥵'} Amanhã {hr}h: condição ruim pr{oque[0]} {oque[2:]}"
    if esp == "corrida":
        dados = f"{round(q['t'])}°, chuva {q['chuva']}%"
    elif esp == "natacao":
        dados = (f"ondas de {str(q['o']).replace('.', ',')} m" if q.get("o") is not None else "sem dado do mar") + \
                (f", água {round(q['s'])}°" if q.get("s") is not None else "") + f", vento {q['v']} km/h"
    else:
        dados = f"vento {q['v']} km/h" + (f" (rajada {q['raj']})" if q["raj"] else "") + f", chuva {q['chuva']}%"
    # texto curto: a praia, o convite pra abrir e o lembrete (os números ficam no app)
    return titulo, f"{nome_praia} · Toque para ver os detalhes. {AVISO}"

def enviar(titulo, texto, filtros, quando, chave):
    app, key = os.environ.get("ONESIGNAL_APP_ID"), os.environ.get("ONESIGNAL_KEY")
    if not app or not key:
        print(f"  (teste, não mandei) {titulo} | {texto}"); return
    corpo = {"app_id": app, "target_channel": "push", "filters": filtros, "send_after": quando,
             "headings": {"en": titulo, "pt": titulo}, "contents": {"en": texto, "pt": texto}, "url": SITE + "?treino"}
    req = urllib.request.Request("https://api.onesignal.com/notifications?c=push", data=json.dumps(corpo).encode(),
        headers={"Content-Type": "application/json", "Authorization": "Key " + key, "idempotency_key": chave[:64]}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            resp = json.loads(r.read().decode() or "{}")
            if resp.get("id"): print(f"  agendado: {titulo}")
    except urllib.error.HTTPError as e:
        erro = e.read().decode()[:200]
        if "not subscribed" not in erro.lower(): print("  erro do OneSignal:", e.code, erro)

def filtros_dia(chave, dia_sem):
    """quem tem o bit do dia (1 = seg ... 7 = dom) ligado na etiqueta. O OneSignal não tem "contém",
    então junta faixas de números (com OU): ex. sábado (32) = 32 a 63 ou 96 a 127."""
    b = 1 << (dia_sem - 1); filtros = []
    for ini in range(b, 128, 2 * b):
        fim = ini + b - 1
        if filtros: filtros.append({"operator": "OR"})
        if ini == fim: filtros.append({"field": "tag", "key": chave, "relation": "=", "value": str(ini)})
        else:
            filtros.append({"field": "tag", "key": chave, "relation": ">", "value": str(ini - 1)})
            filtros.append({"field": "tag", "key": chave, "relation": "<", "value": str(fim + 1)})
    return filtros

def main():
    br = datetime.timezone(datetime.timedelta(hours=-3))
    hoje = datetime.datetime.now(br).date(); amanha = hoje + datetime.timedelta(days=1)
    dia_sem = amanha.weekday() + 1                        # 1 = segunda ... 7 = domingo
    quando = f"{hoje.isoformat()} 20:30:00 GMT-0300"      # se o robô atrasar e já passou, o OneSignal manda na hora
    tempo, mods, mar = previsao()
    inea = balneabilidade()
    for i, (pid, nome_praia, _, _) in enumerate(PRAIAS):
        horas = hora_a_hora(tempo[i], mods[i] if mods else None, amanha.isoformat(), mar[i] if mar else None, pid, inea.get(pid))
        for esp in ESPORTES:
            for hr in HORAS:
                if hr not in horas: continue
                titulo, texto = mensagem(esp, nome_praia, hr, horas[hr])
                chave = f"tr_{esp}_{pid}_{hr}"
                enviar(titulo, texto, filtros_dia(chave, dia_sem), quando, f"tr-{amanha}-{chave}")
                time.sleep(0.12)

if __name__ == "__main__":
    main()

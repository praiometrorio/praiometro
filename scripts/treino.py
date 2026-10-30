# Robô do aviso do Treino cedo.
# Todo fim de tarde olha a previsão de AMANHÃ das 5h às 9h e, para cada combinação esporte + praia + hora,
# agenda uma notificação para as 20h30 só para quem marcou esse dia da semana no app.
# Os treinos de cada pessoa ficam como etiquetas no OneSignal (o app grava), uma por treino:
#   nome "tr_esporte_praia_hora" (ex.: "tr_beach_ipanema_6"), valor = dias da semana somados como bits
#   (seg = 1, ter = 2, qua = 4, qui = 8, sex = 16, sáb = 32, dom = 64; ex.: seg+qua+sex = 21)
# Os limites e as contas são OS MESMOS do app (js/app.js: ESPORTES, notaTreino, bulbo). Se mudar lá, mude aqui.
import json, os, time, datetime, urllib.request, urllib.parse
from praiao import PRAIAS, MODELOS, FUSO, SITE, baixar

ESPORTES = {   # [bom até, atrapalha até] em km/h (vento médio); acima disso é ruim
    "beach":   ("Beach tennis", "🎾", (7, 13)),
    "volei":   ("vôlei", "🏐", (8, 15)),
    "futev":   ("futevôlei", "⚽", (10, 18)),
    "altinha": ("altinha", "🦶", (10, 18)),
    "fresco":  ("frescobol", "🏖️", (12, 20)),
    "corrida": ("corrida", "🏃", (25, 35)),
}
HORAS = [5, 6, 7, 8, 9]
AVISO = "Lembrando: vento e previsão mudam bastante. Confere de novo amanhã cedo no app."

def previsao():
    lat = ",".join(str(p[2]) for p in PRAIAS); lon = ",".join(str(p[3]) for p in PRAIAS)
    base = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&timezone={urllib.parse.quote(FUSO)}&forecast_days=3"
    tempo = baixar(base + "&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m,wind_gusts_10m")
    try: mods = baixar(base + "&hourly=wind_speed_10m&models=" + ",".join(MODELOS))
    except Exception: mods = None
    if isinstance(tempo, dict): tempo = [tempo]
    if isinstance(mods, dict): mods = [mods]
    return tempo, mods

def mediana(xs):
    xs = sorted(xs); n = len(xs)
    return xs[(n - 1) // 2] if n % 2 else (xs[n // 2 - 1] + xs[n // 2]) / 2

def hora_a_hora(t, m, data):
    """vento = mediana dos 9 modelos; rajada = proporção rajada/vento do modelo padrão aplicada ao vento (igual ao app)"""
    h = t["hourly"]; out = {}
    for hr in HORAS:
        ts = f"{data}T{hr:02d}:00"
        if ts not in h["time"]: continue
        k = h["time"].index(ts)
        v = None
        if m:
            mh = m["hourly"]
            if ts in mh["time"]:
                km = mh["time"].index(ts)
                vs = [mh.get("wind_speed_10m_" + md, [None] * len(mh["time"]))[km] for md in MODELOS]
                vs = [x for x in vs if x is not None]
                if len(vs) >= 3: v = mediana(vs)
        if v is None: v = h["wind_speed_10m"][k]
        v = None if v is None else round(v)
        g, vb = h["wind_gusts_10m"][k], h["wind_speed_10m"][k]
        raj = None
        if v is not None and g is not None:
            f = min(2.2, max(1.1, g / vb)) if vb and vb > 3 else 1.5
            raj = max(v + 1, round(v * f))
        out[hr] = {"v": v, "raj": raj, "chuva": h["precipitation_probability"][k] or 0,
                   "t": h["temperature_2m"][k], "ur": h["relative_humidity_2m"][k]}
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
    oque = "a corrida" if esp == "corrida" else ("o " + nome) if esp in ("volei", "futev", "fresco") else ("a " + nome) if esp == "altinha" else "o beach tennis"
    if n == 0: titulo = f"{ic} Amanhã {hr}h tá bom pr{oque[0]} {oque[2:]}!"
    elif n == 1:
        frase = {"vento": "o vento", "vento forte": "o vento forte", "chance de chuva": "a chance de chuva", "abafado": "o abafado"}
        titulo = f"{ic} Amanhã {hr}h dá, mas {' e '.join(frase.get(x, x) for x in motivos)} {'podem' if len(motivos) > 1 else 'pode'} atrapalhar"
    else: titulo = f"{'🌧️' if 'chuva' in motivos else '💨' if 'vento' in ' '.join(motivos) else '🥵'} Amanhã {hr}h: condição ruim pr{oque[0]} {oque[2:]}"
    if esp == "corrida":
        dados = f"{round(q['t'])}°, chuva {q['chuva']}%"
    else:
        dados = f"vento {q['v']} km/h" + (f" (rajada {q['raj']})" if q["raj"] else "") + f", chuva {q['chuva']}%"
    return titulo, f"{nome_praia}: {dados}. {AVISO}"

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
    tempo, mods = previsao()
    for i, (pid, nome_praia, _, _) in enumerate(PRAIAS):
        horas = hora_a_hora(tempo[i], mods[i] if mods else None, amanha.isoformat())
        for esp in ESPORTES:
            for hr in HORAS:
                if hr not in horas: continue
                titulo, texto = mensagem(esp, nome_praia, hr, horas[hr])
                chave = f"tr_{esp}_{pid}_{hr}"
                enviar(titulo, texto, filtros_dia(chave, dia_sem), quando, f"tr-{amanha}-{chave}")
                time.sleep(0.12)

if __name__ == "__main__":
    main()

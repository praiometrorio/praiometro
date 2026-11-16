# Robô do alerta de praião (dia raro, 5+ horas de sol firme) e do "vai dar praia" (dia bom normal).
# Todo fim de tarde olha a previsão (a mesma do site) e:
#  - 3 dias antes: se a previsão estiver MUITO boa, avisa "a princípio tem praião"
#  - na véspera: confirma ou cancela o aviso; se não teve pré-aviso e virou praião, avisa também
# Guarda o que já mandou em data/alertas.json para não repetir.
import urllib.error, json, os, sys, datetime, urllib.request, urllib.parse
ATE_AMANHA = (datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3))).date() + datetime.timedelta(days=1)).isoformat()

FUSO = "America/Sao_Paulo"
SITE = "https://praiometrorio.com.br/"
MODELOS = ["ecmwf_ifs025", "ecmwf_aifs025_single", "gfs_seamless", "icon_seamless", "meteofrance_seamless",
           "ukmo_seamless", "jma_seamless", "gem_seamless", "cma_grapes_global"]
# praias de mar aberto (as da baía não contam para praião, igual ao site)
PRAIAS = [
  ("vermelha", "Praia Vermelha", -22.9555, -43.1645), ("leme", "Leme", -22.9631, -43.1680),
  ("copacabana", "Copacabana", -22.9711, -43.1822), ("arpoador", "Arpoador", -22.9887, -43.1922),
  ("ipanema", "Ipanema", -22.9868, -43.2050), ("leblon", "Leblon", -22.9873, -43.2230),
  ("saoconrado", "São Conrado", -22.9995, -43.2680), ("barra", "Barra", -23.0112, -43.3320),
  ("reserva", "Reserva", -23.0130, -43.3950), ("recreio", "Recreio", -23.0260, -43.4630),
  ("prainha", "Prainha", -23.0410, -43.5060), ("grumari", "Grumari", -23.0480, -43.5250),
  ("piratininga", "Piratininga", -22.9560, -43.0900), ("itaipu", "Itaipu", -22.9660, -43.0530),
  ("itacoatiara", "Itacoatiara", -22.9760, -43.0280),
  ("diabo", "Praia do Diabo", -22.9895, -43.1907), ("vidigal", "Vidigal", -22.9922, -43.2319),
  ("joatinga", "Joatinga", -23.0149, -43.2902),
]
# ordem de desempate: as mais conhecidas aparecem primeiro na mensagem
FAMA = ["ipanema", "copacabana", "leblon", "barra", "arpoador", "leme", "recreio", "grumari", "prainha", "saoconrado",
        "reserva", "vermelha", "itacoatiara", "piratininga", "itaipu", "joatinga", "vidigal", "diabo"]
DIAS = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]

def baixar(url):
    # O Open-Meteo grátis tem limite por IP, e as máquinas do GitHub são compartilhadas com muita gente:
    # às vezes responde 429 ("limite estourado") ou cai. Tenta de novo até 5 vezes, esperando cada vez mais.
    import time
    for t in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Praiometro"}), timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 502, 503, 504) or t == 4: raise
            print(f"Open-Meteo respondeu {e.code}, tentando de novo em {30 * (t + 1)} s"); time.sleep(30 * (t + 1))
        except (urllib.error.URLError, TimeoutError) as e:
            if t == 4: raise
            print("Open-Meteo não respondeu, tentando de novo:", e); time.sleep(30 * (t + 1))

def previsao():
    lat = ",".join(str(p[2]) for p in PRAIAS); lon = ",".join(str(p[3]) for p in PRAIAS)
    base = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&timezone={urllib.parse.quote(FUSO)}&forecast_days=7"
    tempo = baixar(base + "&hourly=precipitation_probability,cloud_cover,wind_speed_10m,temperature_2m&daily=sunrise,sunset")
    try: nuvens = baixar(base + "&hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,wind_speed_10m,precipitation&models=" + ",".join(MODELOS))
    except Exception: nuvens = None
    if isinstance(tempo, dict): tempo = [tempo]
    if isinstance(nuvens, dict): nuvens = [nuvens]
    return tempo, nuvens

def minutos(hhmm):
    return int(hhmm[:2]) * 60 + int(hhmm[3:5])

CHUVA_MM = 0.3   # chance de chuva = % dos 9 modelos com 0,3 mm ou mais na hora (igual ao app)
PESO_NUVEM = {"baixa": 1, "media": 0.9, "alta": 0.55}   # igual ao app: nuvem alta (véu fino) quase não esconde o sol

def nuvem_que_tapa(nh, m, k):
    """igual ao app (nov/2026): cobertura total do céu do modelo; sem ela, a conta por camadas"""
    g = lambda nome: (nh.get(nome + "_" + m) or [None] * len(nh["time"]))[k]
    if g("cloud_cover") is not None: return g("cloud_cover")
    b, md, a = g("cloud_cover_low"), g("cloud_cover_mid"), g("cloud_cover_high")
    if b is None or md is None or a is None: return g("cloud_cover")
    return 100 * (1 - (1 - PESO_NUVEM["baixa"] * b / 100) * (1 - PESO_NUVEM["media"] * md / 100) * (1 - PESO_NUVEM["alta"] * a / 100))

def analisar_dia(t, n, data):
    """EXATAMENTE o mesmo cálculo do app (js/app.js: montar, estadoHora, analisar, ehPraiao):
    - nuvens = média dos 9 modelos (nuvem que tapa o sol: baixa 100%, média 75%, alta 30%); vento = valor do meio (mediana) dos 9 modelos
    - céu de cada hora (6h às 20h): chuva >= 50% = chuva; nuvens >= 70 = nublado; >= 25 = entre nuvens; senão sol;
      antes do nascer / depois do pôr do sol não conta como sol
    - praião: só o horário de praia (9h às 17h); hora de sol = 1 ponto, entre nuvens = meio; véspera 5+ pontos, 3 dias antes 6+; vento = o mais forte entre 9h e 17h; chuva = a maior nas horas boas (9h às 17h, com sol ou entre nuvens)"""
    h = t["hourly"]; media = {}; meio = {}; chance = {}
    if n:
        nh = n["hourly"]
        for k, ts in enumerate(nh["time"]):
            xs = [nuvem_que_tapa(nh, m, k) for m in MODELOS]
            xs = [x for x in xs if x is not None]
            if len(xs) >= 3:
                media[ts] = sum(xs) / len(xs)
                # igual ao app: se 1/3 dos modelos acha que fecha (nuvem >= 60%), vira "entre nuvens", não solzão
                if ts[:10] <= ATE_AMANHA and sum(1 for x in xs if x >= 60) >= len(xs) / 3: media[ts] = max(media[ts], 40)
            ps = [x for x in (nh.get("precipitation_" + m, [None] * len(nh["time"]))[k] for m in MODELOS) if x is not None]
            if len(ps) >= 3: chance[ts] = round(100 * sum(1 for x in ps if x >= CHUVA_MM) / len(ps))   # igual ao app
            vs = sorted(v for v in (nh.get("wind_speed_10m_" + m, [None] * len(nh["time"]))[k] for m in MODELOS) if v is not None)
            # igual ao app (nov/2026): 3º vento mais forte dos modelos (a média amaciava)
            if len(vs) >= 5: meio[ts] = vs[-3]
            elif len(vs) >= 3: meio[ts] = vs[(len(vs) - 1) // 2]
    d = t["daily"]["time"].index(data) if data in t["daily"]["time"] else None
    nas = minutos((t["daily"]["sunrise"][d] or "T05:30")[11:16]) if d is not None else 330
    por = minutos((t["daily"]["sunset"][d] or "T18:30")[11:16]) if d is not None else 1110
    sol, vento, chuva, estados, chuva_sol, temp = 0, 0, 0, {}, 0, None
    for k, ts in enumerate(h["time"]):
        if ts[:10] != data: continue
        hr = int(ts[11:13])
        if hr < 6 or hr > 20: continue
        c = chance.get(ts, h["precipitation_probability"][k] or 0)
        nv = round(media.get(ts, h["cloud_cover"][k] or 0))
        v = meio.get(ts, h["wind_speed_10m"][k])
        # chuva: só conta nas horas boas de praia (9h às 17h com sol ou entre nuvens);
        # chuva só à tarde, depois de uma manhã de sol, vira "praião, mais pela manhã"
        if 9 <= hr <= 17 and c < 50 and nv < 70: chuva = max(chuva, c)
        if v is not None and 9 <= hr <= 17: vento = max(vento, round(v))
        escuro = hr * 60 + 30 < nas - 10 or hr * 60 + 30 > por + 10
        if not escuro and c < 50 and nv < 40: sol += 1
        if 9 <= hr <= 17:
            estados[hr] = "chuva" if c >= 50 else "nublado" if nv >= 70 else "parcial" if nv >= 40 else "sol"
            if estados[hr] == "sol": chuva_sol = max(chuva_sol, c)   # chuva nas horas de sol firme (vale pro praião)
            tp = (h.get("temperature_2m") or [None] * len(h["time"]))[k]
            if tp is not None: temp = max(temp if temp is not None else -99, tp)
    return estados, vento, chuva, chuva_sol, temp

def pontos(estados, de=9, ate=17):
    """horário de praia: hora de sol vale 1, hora entre nuvens vale meio"""
    return sum(1 if estados.get(h) == "sol" else 0.5 if estados.get(h) == "parcial" else 0 for h in range(de, ate + 1))

def horas_firmes(estados, de=9, ate=17):
    """horas de SOL FIRME (Sol ou Sol com nuvens; sol vai e vem não conta)"""
    return sum(1 for h in range(de, ate + 1) if estados.get(h) == "sol")

def tipo_firme(estados):
    """como foi o sol firme do PRAIÃO: dia todo / de manhã / à tarde / maior parte"""
    tot, manha, tarde = horas_firmes(estados), horas_firmes(estados, 9, 13), horas_firmes(estados, 14, 17)
    if tot >= 8: return "todo"
    if manha >= 4 and tarde <= 1: return "manha"
    if tarde >= 3 and manha <= 1: return "tarde"
    return "maior"

def tipo_praiao(estados):
    """igual ao app (tipoPraiao): dia todo / mais pela manhã / mais à tarde / com visitas de algumas nuvens"""
    tot, manha, tarde = pontos(estados), pontos(estados, 9, 13), pontos(estados, 14, 17)
    if tot >= 8: return "todo"
    if manha >= 4 and tarde <= 1.5: return "manha"
    if tarde >= 3.5 and manha <= 2: return "tarde"
    return "nuvens"

# PRAIÃO (dia raro): 5+ horas de SOL FIRME entre 9h e 17h, chuva < 20% nessas horas e vento até 15 km/h
# VAI DAR PRAIA (dia bom normal): 5+ pontos de sol (sol vai e vem vale meio), chuva < 40% e vento até 15 km/h
HORAS_PRAIAO = 5

def praias_boas(tempo, nuvens, data, nivel):
    boas = []
    for i, (pid, nome, _, _) in enumerate(PRAIAS):
        estados, vento, chuva, chuva_sol, temp = analisar_dia(tempo[i], nuvens[i] if nuvens else None, data)
        if nivel == "praiao":
            firme = horas_firmes(estados)
            if firme >= HORAS_PRAIAO and vento <= 15 and chuva_sol < 20:
                boas.append((firme, -vento, -FAMA.index(pid), nome, tipo_firme(estados), temp))
        else:
            pts = pontos(estados)
            if pts >= 5 and vento <= 15 and chuva < 40:
                boas.append((pts, -vento, -FAMA.index(pid), nome, tipo_praiao(estados), temp))
    boas.sort(reverse=True)
    return boas

def tipo_do_dia(boas):
    """o tipo de praião que mais aparece entre as praias boas (empate: o melhor)"""
    ordem = ["todo", "manha", "tarde", "maior", "nuvens"]
    conta = {t: sum(1 for b in boas if b[4] == t) for t in ordem}
    return max(ordem, key=lambda t: (conta[t], -ordem.index(t)))

# como o sol aparece na notificação
SOL_PRAIAO = {"todo": "Solzão o dia inteiro", "manha": "Solzão de manhã", "tarde": "Solzão à tarde", "maior": "Solzão na maior parte do dia"}
SOL_PRAIA = {"todo": "Sol na maior parte do dia", "manha": "Sol de manhã, tarde mais fechada",
             "tarde": "Sol à tarde, manhã mais fechada", "nuvens": "Sol vai e vem", "maior": "Sol na maior parte do dia"}

def graus(boas):
    t = boas[0][5] if boas else None
    return f", {round(t)}°" if t is not None else ""

def nomes(boas):
    lista = [b[3] for b in boas]
    return f"{lista[0]}, {lista[1]} e mais {len(lista) - 2} praias" if len(lista) > 2 else " e ".join(lista)

def enviar(titulo, texto, chave_envio):
    app, key = os.environ.get("ONESIGNAL_APP_ID"), os.environ.get("ONESIGNAL_KEY")
    print(f"→ {titulo} | {texto}")
    if not app or not key:
        print("  (sem as chaves do OneSignal: só testei, não mandei)"); return False
    for segmento in ("Total Subscriptions", "Subscribed Users"):
        corpo = {"app_id": app, "target_channel": "push", "included_segments": [segmento],
                 "headings": {"en": titulo, "pt": titulo}, "contents": {"en": texto, "pt": texto}, "url": SITE,
                 # logo do app na notificação (Android/computador; no iPhone o sistema já usa o ícone do app instalado)
                 "chrome_web_icon": SITE + "icons/icon-192.png", "firefox_icon": SITE + "icons/icon-192.png",
                 "chrome_web_badge": SITE + "icons/icon-192.png"}
        req = urllib.request.Request("https://api.onesignal.com/notifications?c=push", data=json.dumps(corpo).encode(),
            headers={"Content-Type": "application/json", "Authorization": "Key " + key, "idempotency_key": chave_envio[:64]}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                print("  enviado:", r.read().decode()[:200]); return True
        except urllib.error.HTTPError as e:
            erro = e.read().decode()[:300]; print("  erro do OneSignal:", e.code, erro)
            if "segment" not in erro.lower(): break
    return False

def main():
    hoje = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3))).date()
    teste = os.environ.get("TESTE") == "sim"
    if teste:
        enviar("☀️ Teste do Praiômetro", "Se você recebeu isso, o alerta de praião está funcionando!", f"teste-{datetime.datetime.now(datetime.timezone.utc):%Y%m%d%H%M}")
        return
    caminho = "data/alertas.json"
    try: estado = json.load(open(caminho, encoding="utf-8"))
    except Exception: estado = {}
    estado = {k: v for k, v in estado.items() if k >= (hoje - datetime.timedelta(days=3)).isoformat()}   # limpa os velhos
    tempo, nuvens = previsao()
    mudou = False

    # 1) véspera: PRAIÃO (dia raro) ou VAI DAR PRAIA (dia bom normal); se teve pré-aviso e piorou, avisa que mudou
    amanha = (hoje + datetime.timedelta(days=1)).isoformat()
    reg = estado.get(amanha, {})
    if not reg.get("vespera"):
        top = praias_boas(tempo, nuvens, amanha, "praiao")
        boas = praias_boas(tempo, nuvens, amanha, "praia")
        dia = DIAS[(hoje + datetime.timedelta(days=1)).weekday()]
        eh_praiao, eh_praia = len(top) >= 4, len(top) < 4 and len(boas) >= 4
        lista = top if eh_praiao else boas
        # guarda a DECISÃO da véspera (o app mostra a faixa de hoje só se a previsão da véspera cravou)
        dec = {"praiao": eh_praiao, "praia": eh_praia, "tipo": tipo_do_dia(lista) if lista else None,
               "praias": [b[3] for b in lista][:8], "ids": [FAMA[-b[2]] for b in lista][:8],
               "temp": round(lista[0][5]) if lista and lista[0][5] is not None else None}
        if any(reg.get(k) != v for k, v in dec.items()): reg.update(dec); mudou = True
        ok, chave = None, None
        if eh_praiao:
            pre = "Confirmado: amanhã é" if reg.get("pre") else "Amanhã é"
            ok = enviar(f"☀️ {pre} dia de PRAIÃO!", f"{SOL_PRAIAO[tipo_do_dia(top)]}{graus(top)} e vento fraco em {nomes(top)}. Dia raro: aproveita!", f"conf-{amanha}" if reg.get("pre") else f"vesp-{amanha}")
        elif eh_praia and reg.get("pre"):
            ok = enviar(f"😕 Mudou: {dia} não vai ter praião", f"Mas ainda vai dar praia: {SOL_PRAIA[tipo_do_dia(boas)].lower()}{graus(boas)} em {nomes(boas)}. Toca pra ver.", f"canc-{amanha}")
        elif eh_praia:
            ok = enviar("🏖️ Amanhã vai dar praia", f"{SOL_PRAIA[tipo_do_dia(boas)]}{graus(boas)} em {nomes(boas)}. Leva o protetor.", f"praia-{amanha}")
        elif reg.get("pre"):
            ok = enviar(f"😕 Mudou: {dia} não vai ter praião", "A previsão piorou e vai ter mais nuvem que o esperado. Toca pra ver como ficou.", f"canc-{amanha}")
        else:
            print(f"Amanhã ({amanha}): {len(top)} praias de praião e {len(boas)} boas, sem aviso.")
        if ok: reg["vespera"] = True; mudou = True
        if reg: estado[amanha] = reg

    # 2) três dias antes: só PRAIÃO, e com mais praias (5+), para ter menos alarme falso
    alvo_d = hoje + datetime.timedelta(days=3); alvo = alvo_d.isoformat()
    if not estado.get(alvo, {}).get("pre"):
        top = praias_boas(tempo, nuvens, alvo, "praiao")
        dia = DIAS[alvo_d.weekday()]
        vespera = DIAS[(alvo_d - datetime.timedelta(days=1)).weekday()]
        if len(top) >= 5:
            if enviar(f"👀 {dia.capitalize()} pode ser dia de PRAIÃO", f"A previsão está com {SOL_PRAIAO[tipo_do_dia(top)].lower()}{graus(top)} e vento fraco em {nomes(top)}. A gente confirma na {vespera} à noite.", f"pre-{alvo}"):
                estado.setdefault(alvo, {})["pre"] = True; mudou = True
        else:
            print(f"Daqui a 3 dias ({alvo}): só {len(top)} praias de praião, sem pré-aviso.")

    if mudou:
        os.makedirs("data", exist_ok=True)
        json.dump(dict(sorted(estado.items())), open(caminho, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()

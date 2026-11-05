# Robô do alerta de praião.
# Todo fim de tarde olha a previsão (a mesma do site) e:
#  - 3 dias antes: se a previsão estiver MUITO boa, avisa "a princípio tem praião"
#  - na véspera: confirma ou cancela o aviso; se não teve pré-aviso e virou praião, avisa também
# Guarda o que já mandou em data/alertas.json para não repetir.
import json, os, sys, datetime, urllib.request, urllib.parse

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
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Praiometro"}), timeout=60) as r:
        return json.load(r)

def previsao():
    lat = ",".join(str(p[2]) for p in PRAIAS); lon = ",".join(str(p[3]) for p in PRAIAS)
    base = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&timezone={urllib.parse.quote(FUSO)}&forecast_days=7"
    tempo = baixar(base + "&hourly=precipitation_probability,cloud_cover,wind_speed_10m&daily=sunrise,sunset")
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
                if sum(1 for x in xs if x >= 60) >= len(xs) / 3: media[ts] = max(media[ts], 40)
            ps = [x for x in (nh.get("precipitation_" + m, [None] * len(nh["time"]))[k] for m in MODELOS) if x is not None]
            if len(ps) >= 3: chance[ts] = round(100 * sum(1 for x in ps if x >= CHUVA_MM) / len(ps))   # igual ao app
            vs = sorted(v for v in (nh.get("wind_speed_10m_" + m, [None] * len(nh["time"]))[k] for m in MODELOS) if v is not None)
            if len(vs) >= 3: meio[ts] = vs[(len(vs) - 1) // 2] if len(vs) % 2 else (vs[len(vs) // 2 - 1] + vs[len(vs) // 2]) / 2
    d = t["daily"]["time"].index(data) if data in t["daily"]["time"] else None
    nas = minutos((t["daily"]["sunrise"][d] or "T05:30")[11:16]) if d is not None else 330
    por = minutos((t["daily"]["sunset"][d] or "T18:30")[11:16]) if d is not None else 1110
    sol, vento, chuva, estados = 0, 0, 0, {}
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
        if not escuro and c < 50 and nv < 25: sol += 1
        if 9 <= hr <= 17: estados[hr] = "chuva" if c >= 50 else "nublado" if nv >= 70 else "parcial" if nv >= 25 else "sol"
    return estados, vento, chuva

def pontos(estados, de=9, ate=17):
    """horário de praia: hora de sol vale 1, hora entre nuvens vale meio"""
    return sum(1 if estados.get(h) == "sol" else 0.5 if estados.get(h) == "parcial" else 0 for h in range(de, ate + 1))

def tipo_praiao(estados):
    """igual ao app (tipoPraiao): dia todo / mais pela manhã / mais à tarde / com visitas de algumas nuvens"""
    tot, manha, tarde = pontos(estados), pontos(estados, 9, 13), pontos(estados, 14, 17)
    if tot >= 8: return "todo"
    if manha >= 4 and tarde <= 1.5: return "manha"
    if tarde >= 3.5 and manha <= 2: return "tarde"
    return "nuvens"

def praias_boas(tempo, nuvens, data, rigoroso):
    boas = []
    for i, (pid, nome, _, _) in enumerate(PRAIAS):
        estados, vento, chuva = analisar_dia(tempo[i], nuvens[i] if nuvens else None, data)
        pts = pontos(estados)
        ok = (pts >= 6 and vento <= 15 and chuva < 30) if rigoroso else (pts >= 5 and vento <= 15 and chuva < 40)
        if ok: boas.append((pts, -vento, -FAMA.index(pid), nome, tipo_praiao(estados)))
    boas.sort(reverse=True)
    return boas

def tipo_do_dia(boas):
    """o tipo de praião que mais aparece entre as praias boas (empate: o melhor)"""
    ordem = ["todo", "manha", "tarde", "nuvens"]
    conta = {t: sum(1 for b in boas if b[4] == t) for t in ordem}
    return max(ordem, key=lambda t: (conta[t], -ordem.index(t)))

# como cada tipo de praião aparece na notificação: (pedaço do título, frase do texto)
JEITO = {
    "todo":   ("praião o dia todo", "com solzão o dia inteiro e vento fraco"),
    "manha":  ("praião, mais pela manhã", "com sol firme de manhã; à tarde o tempo fecha"),
    "tarde":  ("praião, mais à tarde", "com sol firme à tarde; a manhã começa fechada"),
    "nuvens": ("praião com visitas de algumas nuvens", "com sol entre nuvens e vento fraco"),
}

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
                 "headings": {"en": titulo, "pt": titulo}, "contents": {"en": texto, "pt": texto}, "url": SITE}
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

    # 1) véspera: confirma, cancela ou avisa de surpresa
    amanha = (hoje + datetime.timedelta(days=1)).isoformat()
    reg = estado.get(amanha, {})
    if not reg.get("vespera"):
        boas = praias_boas(tempo, nuvens, amanha, rigoroso=False)
        dia = DIAS[(hoje + datetime.timedelta(days=1)).weekday()]
        tit, frase = JEITO[tipo_do_dia(boas)] if boas else JEITO["todo"]
        ic = "🌤️" if tipo_do_dia(boas) == "nuvens" else "☀️" if boas else ""
        if reg.get("pre"):
            if len(boas) >= 4:
                ok = enviar(f"{ic} Confirmado: amanhã tem {tit}!", f"{nomes(boas)} {frase}. Toca pra ver.", f"conf-{amanha}")
            else:
                ok = enviar(f"😕 Mudou: {dia} não vai ter praião", "A previsão piorou e vai ter mais nuvem que o esperado. Toca pra ver como ficou.", f"canc-{amanha}")
            if ok: reg["vespera"] = True; mudou = True
        elif len(boas) >= 4:
            if enviar(f"{ic} Amanhã tem {tit}!", f"{nomes(boas)} {frase}. Toca pra ver.", f"vesp-{amanha}"):
                reg["vespera"] = True; mudou = True
        else:
            print(f"Amanhã ({amanha}): só {len(boas)} praias boas, sem aviso.")
        if reg: estado[amanha] = reg

    # 2) três dias antes: só avisa se a previsão estiver MUITO boa (menos chance de alarme falso)
    alvo_d = hoje + datetime.timedelta(days=3); alvo = alvo_d.isoformat()
    if not estado.get(alvo, {}).get("pre"):
        boas = praias_boas(tempo, nuvens, alvo, rigoroso=True)
        dia = DIAS[alvo_d.weekday()]
        vespera = DIAS[(alvo_d - datetime.timedelta(days=1)).weekday()]
        if len(boas) >= 5:
            tit, frase = JEITO[tipo_do_dia(boas)]
            if enviar(f"👀 A princípio, {dia} tem {tit}!", f"{nomes(boas)} {frase}. A previsão ainda pode mudar: a gente confirma na {vespera} à noite.", f"pre-{alvo}"):
                estado.setdefault(alvo, {})["pre"] = True; mudou = True
        else:
            print(f"Daqui a 3 dias ({alvo}): só {len(boas)} praias muito boas, sem pré-aviso.")

    if mudou:
        os.makedirs("data", exist_ok=True)
        json.dump(dict(sorted(estado.items())), open(caminho, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()

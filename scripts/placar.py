# Robô do placar: mede se a previsão do Praiômetro acerta o céu.
# 1) Uma vez por dia (primeira rodada a partir das 5h) guarda o que a previsão dizia para cada hora (6h–19h)
#    no ponto de cada aeroporto, com as MESMAS regras do app (9 modelos, cobertura total, regra de 1/3, chuva).
# 2) A cada rodada, junta o que o aeroporto realmente viu (data/observado.json).
# 3) Salva tudo em data/placar.json com o resumo: % de horas acertadas e se a previsão tende a ser otimista.
import json, os, sys, time, datetime, urllib.request

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
BR = datetime.timezone(datetime.timedelta(hours=-3))
MODELOS = ["ecmwf_ifs025", "ecmwf_aifs025_single", "gfs_seamless", "icon_seamless", "meteofrance_seamless",
           "ukmo_seamless", "jma_seamless", "gem_seamless", "cma_grapes_global"]
PONTOS = {"SBRJ": (-22.9105, -43.1631), "SBJR": (-22.9875, -43.3700)}
ARQ = os.path.join(RAIZ, "data", "placar.json")

def estado(nuv, chuva):
    return "chuva" if chuva >= 50 else "nublado" if nuv >= 70 else "parcial" if nuv >= 25 else "sol"

def previsao(lat, lon, dia):
    url = (f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=cloud_cover,precipitation"
           f"&models={','.join(MODELOS)}&timezone=America%2FSao_Paulo&start_date={dia}&end_date={dia}")
    for t in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Praiometro"}), timeout=60) as r:
                h = json.load(r)["hourly"]; break
        except Exception as e:
            print("previsão falhou:", e); time.sleep(15); h = None
    if not h: return None
    out = {}
    for k, ts in enumerate(h["time"]):
        hr = int(ts[11:13])
        if not 6 <= hr <= 19: continue
        xs = [h.get("cloud_cover_" + m, [None] * 99)[k] for m in MODELOS]; xs = [x for x in xs if x is not None]
        ps = [h.get("precipitation_" + m, [None] * 99)[k] for m in MODELOS]; ps = [p for p in ps if p is not None]
        if len(xs) < 3: continue
        nuv = sum(xs) / len(xs)
        if sum(1 for x in xs if x >= 60) >= len(xs) / 3: nuv = max(nuv, 40)
        chuva = round(100 * sum(1 for p in ps if p >= 0.3) / len(ps)) if ps else 0
        out[f"{hr:02d}"] = {"nuvens": round(nuv), "chuva": chuva, "est": estado(nuv, chuva)}
    return out

placar = json.load(open(ARQ, encoding="utf-8")) if os.path.exists(ARQ) else {"dias": {}}
agora = datetime.datetime.now(BR); hoje = agora.strftime("%Y-%m-%d")
dia = placar["dias"].setdefault(hoje, {})
for est, (lat, lon) in PONTOS.items():
    reg = dia.setdefault(est, {"previsto": None, "visto": {}})
    if reg["previsto"] is None and agora.hour >= 5:
        reg["previsto"] = previsao(lat, lon, hoje); reg["previstoAs"] = agora.strftime("%H:%M")
try:
    obs = json.load(open(os.path.join(RAIZ, "data", "observado.json"), encoding="utf-8"))["estacoes"]
except Exception:
    obs = {}
for est in PONTOS:
    for chave, o in obs.get(est, {}).items():
        d, hr = chave[:10], chave[11:13]
        if d in placar["dias"] and est in placar["dias"][d] and 6 <= int(hr) <= 19:
            placar["dias"][d][est]["visto"][hr] = {"nuvens": o["nuvens"], "est": "chuva" if o.get("chuva") else estado(o["nuvens"], 0)}
# resumo: acerto exato, acerto "sol x sem sol" e viés (previsto - visto)
def resumo(dias):
    n = ok = ok2 = 0; vies = []
    for d in dias.values():
        for est in d.values():
            pv, vs = est.get("previsto") or {}, est.get("visto") or {}
            for hr, v in vs.items():
                if hr not in pv: continue
                n += 1; p = pv[hr]
                ok += p["est"] == v["est"]
                ok2 += (p["est"] in ("sol", "parcial")) == (v["est"] in ("sol", "parcial"))
                vies.append(p["nuvens"] - v["nuvens"])
    if not n: return {"horas": 0}
    m = sum(vies) / n
    return {"horas": n, "acertoExato": round(100 * ok / n), "acertoSolOuNao": round(100 * ok2 / n), "viesNuvens": round(m),
            "leitura": "previsão otimista (menos nuvem que o real)" if m < -8 else "previsão pessimista (mais nuvem que o real)" if m > 8 else "sem viés claro"}
datas = sorted(placar["dias"])[-60:]
placar["dias"] = {d: placar["dias"][d] for d in datas}
placar["resumo"] = {"ultimos7dias": resumo({d: placar["dias"][d] for d in datas[-7:]}), "ultimos30dias": resumo({d: placar["dias"][d] for d in datas[-30:]})}
placar["atualizadoEm"] = agora.strftime("%Y-%m-%dT%H:%M")
json.dump(placar, open(ARQ, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("placar:", placar["resumo"])

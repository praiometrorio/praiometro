# Robô dos pluviômetros: lê a chuva MEDIDA NO CHÃO pelas 33 estações do Alerta Rio (Prefeitura do Rio), que mandam
# leitura a cada 5 minutos. É a "verdade" da chuva: serve para o app confirmar o que o radar vê e para montar o
# placar da chuva (previsto x choveu de verdade).
# Salva em data/chuva.json:
#   "agora":  última leitura de cada estação  {nome: {"lat","lon","m15","h01","em"}}   (mm em 15 min e em 1 hora)
#   "horas":  chuva de cada hora fechada      {"2026-11-16T11": {nome: mm na hora}}    (guarda 30 dias)
import json, os, sys, time, datetime, urllib.request, urllib.error

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
ARQ = os.path.join(RAIZ, "data", "chuva.json")
URL = "https://websempre.rio.rj.gov.br/json/chuvas"
BR = datetime.timezone(datetime.timedelta(hours=-3))

def baixar():
    for t in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0 Praiometro"}), timeout=40) as r:
                return json.load(r)
        except Exception as e:
            print("Alerta Rio não respondeu:", e); time.sleep(10)
    return None

def ler(bruto):
    """devolve {nome: {lat, lon, m15, h01, em}} só com leituras válidas"""
    out = {}
    for o in (bruto or {}).get("objects", []):
        try:
            d = o["data"]; la, lo = o["location"]
            out[o["name"]] = {"lat": round(la, 5), "lon": round(lo, 5), "m15": round(float(d["m15"]), 1),
                              "h01": round(float(d["h01"]), 1), "em": o["read_at"][:16]}
        except Exception:
            continue      # estação sem dado (ND, manutenção): pula
    return out

if __name__ == "__main__":
    bruto = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else baixar()      # (arquivo = modo de teste)
    est = ler(bruto)
    if len(est) < 5:
        print("sem dados dos pluviômetros agora"); sys.exit(0)
    dados = json.load(open(ARQ)) if os.path.exists(ARQ) else {}
    dados.setdefault("horas", {})
    dados["agora"] = est
    # hora fechada: a leitura feita nos primeiros 20 min da hora traz, em "h01", a chuva da hora anterior (quase toda)
    for nome, e in est.items():
        t = datetime.datetime.fromisoformat(e["em"] + ":00-03:00")
        if t.minute <= 20:
            chave = (t - datetime.timedelta(hours=1)).strftime("%Y-%m-%dT%H")
            dados["horas"].setdefault(chave, {}).setdefault(nome, e["h01"])
    corte = (datetime.datetime.now(BR) - datetime.timedelta(days=30)).strftime("%Y-%m-%dT%H")
    dados["horas"] = {k: v for k, v in sorted(dados["horas"].items()) if k >= corte}
    dados["atualizadoEm"] = datetime.datetime.now(BR).strftime("%Y-%m-%dT%H:%M")
    dados["_comoFunciona"] = "Chuva medida pelos pluviômetros do Alerta Rio (mm). agora = última leitura; horas = chuva de cada hora fechada."
    json.dump(dados, open(ARQ, "w"), ensure_ascii=False, separators=(",", ":"))
    print("pluviômetros:", len(est), "estações; chovendo agora em", sum(1 for e in est.values() if e["m15"] > 0))

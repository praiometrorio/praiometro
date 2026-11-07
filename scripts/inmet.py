# Robô das estações do INMET: pega temperatura, umidade e vento MEDIDOS de hora em hora nas estações
# automáticas do INMET perto das praias (ex.: Forte de Copacabana) e salva em data/inmet.json.
# Cada praia usa a estação mais perto dela (até 7 km). Praia sem estação perto fica só com a previsão.
# Se o INMET pedir chave, coloque-a no segredo INMET_TOKEN do GitHub (o robô tenta sem e com).
import json, math, os, re, sys, time, datetime, urllib.request

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
BR = datetime.timezone(datetime.timedelta(hours=-3))
BASE = "https://apitempo.inmet.gov.br"
TOKEN = os.environ.get("INMET_TOKEN", "").strip()
RAIO_KM = 7.0

def baixa(caminho):
    urls = [BASE + caminho] + ([BASE + "/token" + caminho + "/" + TOKEN] if TOKEN else [])
    for u in urls:
        for tent in range(2):
            try:
                with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0 Praiometro"}), timeout=60) as r:
                    txt = r.read().decode("utf-8", "replace").strip()
                    print("resposta", (u.replace(TOKEN, "***") if TOKEN else u)[:90], "→ status", r.status, "| tamanho", len(txt), "| começo:", txt[:120].replace("\n", " "))
                    return json.loads(txt) if txt[:1] in "[{" else []
            except Exception as e:
                print("falhou", (u.replace(TOKEN, "***") if TOKEN else u)[:90], "→", e); time.sleep(5)
    return None

def praias():
    txt = open(os.path.join(RAIZ, "js", "praias.js"), encoding="utf-8").read()
    return [(m.group(1), float(m.group(2)), float(m.group(3))) for m in
            re.finditer(r'id:\s*"(\w+)".*?lat:\s*(-?[\d.]+),\s*lon:\s*(-?[\d.]+)', txt)]

def km(a, b, c, d):
    return math.hypot((a - c) * 111.32, (b - d) * 111.32 * math.cos(math.radians(a)))

def num(v):
    try: return None if v in (None, "") else float(v)
    except Exception: return None

lista = baixa("/estacoes/T")
if not lista:
    print("Não consegui a lista de estações do INMET agora; fica o arquivo de antes."); sys.exit(0)
estacoes = [e for e in lista if e.get("CD_ESTACAO") and num(e.get("VL_LATITUDE")) is not None]
mapa = {}
for pid, lat, lon in praias():
    perto = sorted(((km(lat, lon, num(e["VL_LATITUDE"]), num(e["VL_LONGITUDE"])), e) for e in estacoes), key=lambda x: x[0])
    if perto and perto[0][0] <= RAIO_KM: mapa[pid] = {"e": perto[0][1]["CD_ESTACAO"], "km": round(perto[0][0], 1)}
usadas = sorted(set(v["e"] for v in mapa.values()))
print("praias com estação:", mapa)
if not usadas:
    print("Nenhuma estação do INMET perto das praias."); sys.exit(0)

agora = datetime.datetime.now(datetime.timezone.utc)
ini = (agora - datetime.timedelta(days=1)).strftime("%Y-%m-%d"); fim = agora.strftime("%Y-%m-%d")
saida = {"_comoFunciona": "Medições reais das estações automáticas do INMET (hora de Brasília). t=°C, ur=%, v e raj=km/h, vd=graus.",
         "atualizadoEm": datetime.datetime.now(BR).strftime("%Y-%m-%dT%H:%M"), "praias": mapa, "estacoes": {},
         "estacaoInfo": {e["CD_ESTACAO"]: {"lat": num(e["VL_LATITUDE"]), "lon": num(e["VL_LONGITUDE"])} for e in estacoes if e["CD_ESTACAO"] in usadas}}
dia_todo = None
for cod in usadas:
    dados = baixa(f"/estacao/{ini}/{fim}/{cod}")
    if not dados:   # plano B: o endpoint do dia inteiro (todas as estações), filtrando a nossa
        if dia_todo is None:
            dia_todo = (baixa(f"/estacao/dados/{ini}") or []) + (baixa(f"/estacao/dados/{fim}") or [])
        dados = [d for d in dia_todo if isinstance(d, dict) and d.get("CD_ESTACAO") == cod]
        for d in dados: d.setdefault("DT_MEDICAO", d.get("DT_MEDICAO") or fim)
    if not isinstance(dados, list) or not dados: print("sem medições de", cod); continue
    nome = next((e.get("DC_NOME") for e in estacoes if e["CD_ESTACAO"] == cod), cod)
    horas = {}
    for d in dados:
        try:
            hm = str(d.get("HR_MEDICAO", "")).zfill(4)
            utc = datetime.datetime.strptime(d["DT_MEDICAO"] + hm[:2], "%Y-%m-%d%H").replace(tzinfo=datetime.timezone.utc)
            t = num(d.get("TEM_INS"))
            if t is None: continue
            v = num(d.get("VEN_VEL")); raj = num(d.get("VEN_RAJ"))
            horas[utc.astimezone(BR).strftime("%Y-%m-%dT%H")] = {"t": t, "ur": num(d.get("UMD_INS")),
                "v": None if v is None else round(v * 3.6, 1), "vd": num(d.get("VEN_DIR")), "raj": None if raj is None else round(raj * 3.6, 1)}
        except Exception as e:
            print("pulei uma medição:", e)
    if horas: saida["estacoes"][cod] = {"nome": nome, "horas": horas}
if not saida["estacoes"]:
    print("Sem medições aproveitáveis agora; fica o arquivo de antes."); sys.exit(0)
with open(os.path.join(RAIZ, "data", "inmet.json"), "w", encoding="utf-8") as f:
    json.dump(saida, f, ensure_ascii=False, indent=1)
print("OK", {k: (v["nome"], len(v["horas"])) for k, v in saida["estacoes"].items()})

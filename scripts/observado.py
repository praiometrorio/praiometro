# Robô do céu observado: pega as observações reais dos aeroportos (METAR) das últimas horas
# e salva em data/observado.json. O app usa isso pra corrigir as horas que JÁ passaram hoje
# (a previsão às vezes erra a nuvem baixa da manhã). Santos Dumont = Zona Sul, Centro e Niterói;
# Jacarepaguá = Barra, Recreio e Zona Oeste; Galeão = reserva se faltar algum.
import json, os, datetime, urllib.request

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
ESTACOES = ["SBRJ", "SBJR", "SBGL"]
COBRE = {"FEW": 0.19, "SCT": 0.44, "BKN": 0.75, "OVC": 1.0, "VV": 1.0}
BR = datetime.timezone(datetime.timedelta(hours=-3))

def total(nuvens):
    """céu inteiro coberto (0 a 100), sem desconto pela altura"""
    livre = 1.0
    for c in nuvens or []: livre *= 1 - COBRE.get(c.get("cover"), 0)
    return round(100 * (1 - livre))

def tapa(nuvens):
    """quanto a nuvem tapa o sol (0 a 100), mesma ideia do app: baixa conta inteira, média 75%, alta 30%"""
    livre = 1.0
    for c in nuvens or []:
        f = COBRE.get(c.get("cover"), 0); base = c.get("base") or 0
        peso = 1 if base < 6500 else 0.85 if base < 20000 else 0.45
        livre *= 1 - f * peso
    return round(100 * (1 - livre))

url = "https://aviationweather.gov/api/data/metar?ids=" + ",".join(ESTACOES) + "&format=json&hours=14"
with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Praiometro"}), timeout=60) as r:
    dados = json.load(r)

saida = {"_comoFunciona": "Observação real dos aeroportos (METAR). nuvens = quanto a nuvem tapa o sol (0-100); chuva = true se estava chovendo.",
         "atualizadoEm": datetime.datetime.now(BR).strftime("%Y-%m-%dT%H:%M"), "estacoes": {}}
for m in dados:
    est = m.get("icaoId")
    t = datetime.datetime.fromtimestamp(m["obsTime"], BR)
    chave = t.strftime("%Y-%m-%dT%H")
    wx = (m.get("wxString") or "")
    cobertura = "CAVOK" if (m.get("rawOb") or "").find("CAVOK") >= 0 else None
    n = 0 if cobertura else tapa(m.get("clouds"))
    saida["estacoes"].setdefault(est, {})
    # guarda a observação mais próxima da hora cheia
    if chave not in saida["estacoes"][est] or t.minute <= 15:
        saida["estacoes"][est][chave] = {"nuvens": n, "total": 0 if cobertura else total(m.get("clouds")), "chuva": any(x in wx for x in ("RA", "DZ", "SH", "TS"))}
with open(os.path.join(RAIZ, "data", "observado.json"), "w", encoding="utf-8") as f:
    json.dump(saida, f, ensure_ascii=False, indent=1)
print("OK", {k: len(v) for k, v in saida["estacoes"].items()})

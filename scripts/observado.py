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
    # "FEW" (poucas nuvens) conta 25% aqui: já não é céu limpo (o aeroporto quase nunca anota os cirros, então somos rigorosos)
    for c in nuvens or []: livre *= 1 - (0.25 if c.get("cover") == "FEW" else COBRE.get(c.get("cover"), 0))
    return round(100 * (1 - livre))

def tapa(nuvens):
    """quanto a nuvem tapa o sol (0 a 100), mesma ideia do app: baixa conta inteira, média 75%, alta 30%"""
    livre = 1.0
    for c in nuvens or []:
        f = COBRE.get(c.get("cover"), 0); base = c.get("base") or 0
        peso = 1 if base < 6500 else 0.9 if base < 20000 else 0.55
        livre *= 1 - f * peso
    return round(100 * (1 - livre))

url = "https://aviationweather.gov/api/data/metar?ids=" + ",".join(ESTACOES) + "&format=json&hours=14"
import sys, time
dados = None
for tentativa in range(3):   # o site dos aeroportos às vezes demora ou cai: tenta 3 vezes
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Praiometro"}), timeout=60) as r:
            dados = json.loads(r.read().decode() or "[]")
        break
    except Exception as e:
        print("tentativa", tentativa + 1, "falhou:", e); time.sleep(20)
if not dados:
    print("Sem resposta dos aeroportos agora; fica o arquivo de antes (sem erro)."); sys.exit(0)

saida = {"_comoFunciona": "Observação real dos aeroportos (METAR). nuvens = quanto a nuvem tapa o sol (0-100); chuva = true se estava chovendo.",
         "atualizadoEm": datetime.datetime.now(BR).strftime("%Y-%m-%dT%H:%M"), "estacoes": {}}
for m in dados if isinstance(dados, list) else []:
  try:   # uma observação estranha não derruba o robô: pula ela
      est = m.get("icaoId")
      t = datetime.datetime.fromtimestamp(m["obsTime"], BR)
      chave = t.strftime("%Y-%m-%dT%H")
      wx = (m.get("wxString") or "")
      # v16.6: CAVOK / NSC / NCD NÃO querem dizer céu limpo: só que não há nuvem ABAIXO de ~1.500 m (5.000 pés).
      # Nuvem média e alta (altocúmulo, cirro) pode cobrir o céu inteiro com CAVOK (ex.: 12/11, Botafogo fechado e SBRJ "CAVOK").
      # Então, sem grupo de nuvem no METAR, o céu fica "desconhecido" (None); só SKC/CLR = limpo de verdade.
      raw = (m.get("rawOb") or "").split()
      if m.get("clouds"): n = total(m.get("clouds"))
      elif "SKC" in raw or "CLR" in raw: n = 0
      else: n = None
      saida["estacoes"].setdefault(est, {})
      # guarda a observação mais próxima da hora cheia
      if chave not in saida["estacoes"][est] or t.minute <= 15:
          saida["estacoes"][est][chave] = {"nuvens": n, "total": n, "chuva": any(x in wx for x in ("RA", "DZ", "SH", "TS")), "temp": m.get("temp")}
  except Exception as e:
    print("pulei uma observação:", e)
if not saida["estacoes"]:
    print("Nenhuma observação aproveitável agora; fica o arquivo de antes."); sys.exit(0)
with open(os.path.join(RAIZ, "data", "observado.json"), "w", encoding="utf-8") as f:
    json.dump(saida, f, ensure_ascii=False, indent=1)
print("OK", {k: len(v) for k, v in saida["estacoes"].items()})

# Robô do relevo: calcula, uma vez, o "horizonte" de cada praia (o ângulo do morro mais alto
# em cada direção, de 10 em 10 graus) e salva em data/horizontes.json.
# O relevo não muda, então basta rodar uma vez (ou quando entrar praia nova). O app usa esse arquivo
# e só pergunta ao serviço de relevo se a praia não estiver nele. Mesma conta de js/sol.js.
import json, math, re, time, urllib.request, os

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
DIRECOES = 36
DISTANCIAS = [0.25, 0.4, 0.6, 0.9, 1.3, 1.8, 2.5, 3.4, 4.6, 6.0]
OLHO = 3

def praias():
    txt = open(os.path.join(RAIZ, "js", "praias.js"), encoding="utf-8").read()
    return [(m.group(1), float(m.group(2)), float(m.group(3))) for m in
            re.finditer(r'id:\s*"(\w+)".*?lat:\s*(-?[\d.]+),\s*lon:\s*(-?[\d.]+)', txt)]

def destino(lat, lon, az, km):
    r = math.radians(az)
    return lon + km * math.sin(r) / (111.32 * math.cos(math.radians(lat))), lat + km * math.cos(r) / 111.32

def elevacoes(pts):
    out = []
    for i in range(0, len(pts), 100):
        lote = pts[i:i + 100]
        url = ("https://api.open-meteo.com/v1/elevation?latitude=" + ",".join(f"{q[1]:.5f}" for q in lote) +
               "&longitude=" + ",".join(f"{q[0]:.5f}" for q in lote))
        for tent in range(5):
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Praiometro"}), timeout=60) as r:
                    out += json.load(r)["elevation"]; break
            except Exception as e:
                print("  tentando de novo:", e); time.sleep(5 * (tent + 1))
        else:
            raise SystemExit("Serviço de relevo indisponível")
        time.sleep(1.5)
    return out

def angulos(elev):
    ang, k = [], 0
    for _ in range(DIRECOES):
        mx = 0
        for d in DISTANCIAS:
            e = elev[k]; k += 1
            if e is None: continue
            queda = d * d / (2 * 6371) * 1000
            a = math.degrees(math.atan((e - OLHO - queda) / (d * 1000)))
            mx = max(mx, a)
        ang.append(round(mx, 1))
    return ang

saida = {}
for pid, lat, lon in praias():
    pts = [destino(lat, lon, i * 10, d) for i in range(DIRECOES) for d in DISTANCIAS]
    saida[pid] = angulos(elevacoes(pts))
    print(pid, max(saida[pid]))
with open(os.path.join(RAIZ, "data", "horizontes.json"), "w", encoding="utf-8") as f:
    json.dump(saida, f, ensure_ascii=False)
print("OK:", len(saida), "praias")

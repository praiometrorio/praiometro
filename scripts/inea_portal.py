# Robô da água (INEA, portal novo SEIRHI): lê a classificação OFICIAL de cada ponto de coleta (própria/imprópria),
# que o INEA publica às terças e sextas em https://seirhi.inea.rj.gov.br/publico, e atualiza data/balneabilidade.json.
# O site só responde para máquinas no Brasil: este robô roda no computador do Praiômetro (runner próprio, Windows).
import json, os, re, sys, time, urllib.request, datetime

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
ARQ = os.path.join(RAIZ, "data", "balneabilidade.json")
URL = "https://seirhi.inea.rj.gov.br/publico"

# pontos de coleta do INEA de cada praia do app. Recreio/Reserva/Barra separados pela posição de cada ponto no mapa
# do portal (o robô antigo trocava Recreio e Barra). Glória (FL0008) e Pontal de Sernambetiba ficam de fora.
PONTOS = {
    "flamengo": ["02RJ10FL0000", "02RJ10FL0004"], "botafogo": ["02RJ10BT0000", "02RJ10BT0001"],
    "vermelha": ["02RJ10VR0000"], "leme": ["02RJ01LM0002", "02RJ01LM0003"],
    "copacabana": ["02RJ01CP0100", "02RJ01CP0004", "02RJ01CP0005", "02RJ01CP0008"],
    "arpoador": ["02RJ01AR0000"], "diabo": ["02RJ01PD0000"],
    "ipanema": ["02RJ01IP0003", "02RJ01IP0010", "02RJ01IP0006"], "leblon": ["02RJ01LB0000", "02RJ01LB0001", "02RJ01LB0003"],
    "vidigal": ["02RJ01VD0000"], "saoconrado": ["02RJ01PP0010", "02RJ01GV0001", "02RJ01GV0002"], "joatinga": ["02RJ01JT0000"],
    "barra": ["02RJ01BD0007", "02RJ01BD0009", "02RJ01BD0010"], "reserva": ["02RJ01BD0003", "02RJ01BD0011", "02RJ01BD0005"],
    "recreio": ["02RJ01BD0000", "02RJ01BD0002", "02RJ01BD0004"], "prainha": ["02RJ01PN0000"],
    "grumari": ["02RJ01GM0000", "02RJ01GM0001"],
    "icarai": ["02RJ10IC0000", "02RJ10IC0001", "02RJ10IC0002", "02RJ10IC0003"],
    "piratininga": ["02RJ01PR0000", "02RJ01PR0001", "02RJ01PR0002", "02RJ01PR0003"],
    "itaipu": ["02RJ01CM0000", "02RJ01CM0001", "02RJ01II0000", "02RJ01II0001"], "itacoatiara": ["02RJ01IA0000", "02RJ01IA0001"],
}

def baixar():
    for t in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0 Praiometro"}), timeout=60) as r:
                return r.read().decode("utf-8")
        except Exception as e:
            print("portal do INEA não respondeu:", e); time.sleep(20)
    return None

def ler(html):
    """{codigo: (estado, data_da_ultima_coleta)} a partir dos dados que vêm dentro da página"""
    t = html.replace('\\"', '"')
    pts = {}
    for m in re.finditer(r'\{"id":"(\d\dRJ\d\d[A-Z]{2}\d{4})"[^{}]*?"estado":"([a-z_]+)"[^{}]*?"ultimaColeta":(null|"(\d{4}-\d\d-\d\d))', t):
        pts.setdefault(m.group(1), (m.group(2), m.group(4)))
    coletas = re.search(r"Coletas recebidas até (\d\d)/(\d\d)/(\d{4})", t)
    return pts, (f"{coletas.group(3)}-{coletas.group(2)}-{coletas.group(1)}" if coletas else None)

if __name__ == "__main__":
    html = open(sys.argv[1], encoding="utf-8").read() if len(sys.argv) > 1 else baixar()     # (arquivo = modo de teste)
    if not html: sys.exit(0)
    pts, ate = ler(html)
    if len(pts) < 50:
        print("página veio diferente do esperado (", len(pts), "pontos ): não mexo em nada"); sys.exit(0)
    dados = json.load(open(ARQ, encoding="utf-8")) if os.path.exists(ARQ) else {"praias": {}}
    dados.setdefault("praias", {})
    for praia, codigos in PONTOS.items():
        vals = [pts[c] for c in codigos if c in pts and pts[c][0] in ("propria", "impropria")]
        if not vals: continue
        ok = sum(1 for e, _ in vals if e == "propria")
        datas = [d for _, d in vals if d]
        velho = dados["praias"].get(praia) if isinstance(dados["praias"].get(praia), dict) else {}
        dados["praias"][praia] = {**velho, "ok": ok, "total": len(vals),
                                  "propria": True if ok == len(vals) else False if ok == 0 else None,
                                  "data": max(datas) if datas else velho.get("data"), "fonte": "portal SEIRHI/INEA"}
    dados["portalINEA"] = {"url": URL, "coletasAte": ate, "lidoEm": datetime.date.today().isoformat()}
    dados["atualizadoEm"] = datetime.date.today().isoformat()
    json.dump(dados, open(ARQ, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("água atualizada: coletas até", ate, "·", {p: v["propria"] for p, v in dados["praias"].items() if v.get("fonte") == "portal SEIRHI/INEA"})

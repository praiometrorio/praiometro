# Lê o Boletim Semanal de Balneabilidade do INEA (PDF) e atualiza a água das praias do Rio.
#
# O boletim não traz tabela: são mapas com alfinetes verdes (própria) e vermelhos (imprópria).
# Este robô acha a página "Zona Sul / Zona Sudoeste", tira as duas imagens de mapa, encontra os
# alfinetes pela cor e compara com a posição conhecida de cada ponto (o modelo abaixo).
#
# Trava de segurança: se algum alfinete esperado não aparecer, ou aparecer alfinete em lugar
# desconhecido, aquele mapa NÃO é usado (o INEA pode ter mudado o desenho). O app continua com
# o boletim anterior e o robô avisa no log.
import io, json, re, sys, datetime, os

try:
    import pymupdf as fitz   # PyMuPDF
except ImportError:
    import fitz
import numpy as np
from PIL import Image

PAGINA = "https://www.inea.rj.gov.br/ar-agua-e-solo/balneabilidade-das-praias/"
CAB = {"User-Agent": "Mozilla/5.0 (Praiometro; +https://praiometrorio.github.io/praiometro/)"}

# Posição de cada alfinete no mapa (centro do alfinete, em fração da largura e da altura da imagem).
# Medido no boletim de 22/10/2026 (imagens de 1228 x 709 e 1228 x 992 pixels).
# praia = id do Praiômetro; None = ponto que o app não mostra (legenda, Glória, Urca, Pontal...).
def _p(lista, W, H):
    return [(praia, x / W, y / H) for praia, x, y in lista]

MODELOS = {
    "sudoeste": _p([
        (None, 83, 164), (None, 84, 208),                      # legenda
        (None, 53, 545),                                        # Barra de Guaratiba
        ("grumari", 205, 454), ("grumari", 237, 451),
        ("prainha", 308, 418),
        (None, 354, 399), (None, 366, 395),                     # Pontal de Sernambetiba
        ("recreio", 459, 373), ("recreio", 550, 341),
        ("reserva", 813, 300), ("reserva", 831, 295),
        ("barra", 873, 296), ("barra", 995, 297), ("barra", 1120, 318), ("barra", 1145, 316),
        ("joatinga", 1179, 313),
    ], 1228, 709),
    "sul": _p([
        (None, 86, 173), (None, 87, 217),                       # legenda
        (None, 1095, 85),                                       # Glória
        ("flamengo", 1069, 160), ("flamengo", 1065, 225),
        ("botafogo", 979, 324), ("botafogo", 974, 361),
        (None, 1136, 359),                                      # Urca
        ("vermelha", 1126, 436),
        ("leme", 1095, 528),
        ("copacabana", 978, 590), ("copacabana", 931, 632), ("copacabana", 885, 716), ("copacabana", 891, 747),
        ("arpoador", 856, 790), ("diabo", 874, 790),
        ("ipanema", 640, 768), ("ipanema", 688, 769), ("ipanema", 728, 769),
        ("leblon", 521, 783), ("leblon", 561, 769), ("leblon", 610, 768),
        ("vidigal", 469, 811),
        ("saoconrado", 257, 886), ("saoconrado", 219, 893), ("saoconrado", 103, 905),
    ], 1228, 992),
}
TOLERANCIA = 0.022   # distância máxima entre o alfinete achado e o esperado (fração da largura)


def alfinetes(img):
    """Acha os alfinetes verdes e vermelhos: devolve [(cor, x, y, tamanho)] com x, y em fração."""
    a = np.asarray(img.convert("RGB")).astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    verm = (r > 170) & (g < 80) & (b < 90)
    verde = (g > 100) & (g < 170) & (r < 110) & (b < 110) & (g - r > 35) & (g - b > 35)
    H, W = verm.shape
    achados = []
    for nome, mask in (("propria", verde), ("impropria", verm)):
        vis = np.zeros_like(mask)
        ys, xs = np.nonzero(mask)
        for y0, x0 in zip(ys, xs):
            if vis[y0, x0]:
                continue
            pilha = [(y0, x0)]; vis[y0, x0] = True; pts = []
            while pilha:
                y, x = pilha.pop(); pts.append((y, x))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < H and 0 <= xx < W and mask[yy, xx] and not vis[yy, xx]:
                        vis[yy, xx] = True; pilha.append((yy, xx))
            if len(pts) >= 60:      # menor que isso é ruído (texto, rua pintada etc.)
                py = sum(p[0] for p in pts) / len(pts); px = sum(p[1] for p in pts) / len(pts)
                achados.append((nome, px / W, py / H, len(pts)))
    return achados


def ler_mapa(img, modelo):
    """Compara os alfinetes achados com o modelo. Devolve {praia: [status...]} ou None se não bater."""
    achados = alfinetes(img)
    usados = set()
    resultado = {}
    for praia, ex, ey in modelo:
        perto = [(abs(ax - ex) + abs(ay - ey), i) for i, (_, ax, ay, _) in enumerate(achados)]
        perto = [p for p in perto if p[0] <= TOLERANCIA * 1.6]
        if not perto:
            return None, f"faltou o alfinete esperado em ({ex:.3f}, {ey:.3f})"
        i = min(perto)[1]; usados.add(i)
        if praia:
            resultado.setdefault(praia, []).append(achados[i][0])
    sobra = [a for i, a in enumerate(achados) if i not in usados]
    if sobra:
        return None, f"{len(sobra)} alfinete(s) em lugar desconhecido: {[(c, round(x, 3), round(y, 3)) for c, x, y, _ in sobra]}"
    return resultado, "ok"


def data_br(txt):
    d, m, a = txt.split("/")
    return datetime.date(2000 + int(a) if len(a) == 2 else int(a), int(m), int(d)).isoformat()


def processar_pdf(pdf_bytes):
    """Devolve {praia: {...}} lido do boletim, só dos mapas que passaram na conferência."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pagina = None
    for pg in doc:
        t = pg.get_text()
        if "Zona Sul" in t and "Zona Sudoeste" in t:
            pagina = pg; break
    if pagina is None:
        print("Boletim: não achei a página da Zona Sul / Zona Sudoeste"); return {}
    # as duas imagens grandes de mapa, de cima para baixo (em cima: Zona Sudoeste; embaixo: Zona Sul)
    infos = [i for i in pagina.get_image_info(xrefs=True) if i["width"] >= 800 and i["height"] >= 400 and i["width"] > i["height"]]
    infos.sort(key=lambda i: i["bbox"][1])
    # datas "Última Amostragem: dd/mm/aa", também de cima para baixo
    spans = []
    for bl in pagina.get_text("dict")["blocks"]:
        for ln in bl.get("lines", []):
            txt = "".join(s["text"] for s in ln["spans"])
            m = re.search(r"(\d{2}/\d{2}/\d{2,4})", txt)
            if "Amostragem" in txt and m:
                spans.append((ln["bbox"][1], m.group(1)))
    spans.sort()
    datas = [data_br(d) for _, d in spans]
    saida = {}
    for n, info in enumerate(infos[:2]):
        img = Image.open(io.BytesIO(doc.extract_image(info["xref"])["image"]))
        # tenta os dois modelos e fica com o que bater
        for nome, modelo in MODELOS.items():
            res, msg = ler_mapa(img, modelo)
            if res is not None:
                break
        if res is None:
            print(f"Boletim: o mapa {n + 1} não bateu com nenhum modelo ({msg}). Mantive os dados anteriores.")
            continue
        data = datas[n] if n < len(datas) else (datas[0] if datas else None)
        print(f"Boletim: mapa {nome} lido, amostragem de {data}")
        for praia, sts in res.items():
            ok = sum(1 for s in sts if s == "propria")
            saida[praia] = {"ok": ok, "total": len(sts), "propria": True if ok == len(sts) else False if ok == 0 else None,
                            "data": data, "fonte": "boletim semanal INEA"}
    return saida


def main():
    import requests
    html = requests.get(PAGINA, headers=CAB, timeout=60).text
    m = re.search(r'href="([^"]*Boletim[^"]*Balneabilidade[^"]*\.pdf)"', html, re.I)
    if not m:
        print("Boletim: não achei o link do boletim semanal na página do INEA"); return
    url = m.group(1)
    print("Boletim:", url)
    pdf = requests.get(url, headers=CAB, timeout=300).content
    lidas = processar_pdf(pdf)
    if not lidas:
        return
    caminho = "data/balneabilidade.json"
    try: atual = json.load(open(caminho, encoding="utf-8"))
    except Exception: atual = {"praias": {}}
    praias = atual.setdefault("praias", {})
    for pid, v in lidas.items():
        antigo = praias.get(pid) or {}
        # só troca se o boletim for igual ou mais novo que o que já temos
        if not antigo.get("data") or (v["data"] and v["data"] >= antigo["data"]):
            praias[pid] = v
    atual["boletimSemanal"] = {"url": url, "lidoEm": datetime.date.today().isoformat()}
    json.dump(atual, open(caminho, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"Boletim: {len(lidas)} praias atualizadas")


if __name__ == "__main__":
    main()

# Robô da previsão (v18.8): baixa UMA vez a previsão que o app usa (as 21 praias nos 9 modelos, mais o mar) e deixa
# num arquivo só, para todos os celulares lerem dele em vez de cada um ir ao Open-Meteo.
# Por quê: o Open-Meteo grátis limita os pedidos por endereço de internet (600 por minuto, 5.000 por hora, 10.000 por dia),
# e cada carga completa do app pesa ~200 pedidos. Com o robô, quem fala com o Open-Meteo é só ele.
# O arquivo guarda as 3 respostas do Open-Meteo do jeitinho que vêm, mais os 3 endereços pedidos ("urls"):
# o app só usa o arquivo se esses endereços forem IGUAIS aos que ele mesmo pediria (mesmas praias, mesmas variáveis)
# e se o arquivo tiver menos de 3 horas. Senão, o app busca direto no Open-Meteo, como sempre fez. Nada quebra.
# IMPORTANTE: os 3 endereços abaixo têm de ser idênticos aos de js/app.js (urlPrevisao, urlNuvens, urlMar).
import json, os, re, sys, time, urllib.request

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SAIDA = os.path.join(RAIZ, "saida", "previsao.json")
FUSO = "America%2FSao_Paulo"
MODELOS = ["ecmwf_ifs025", "ecmwf_aifs025_single", "gfs_seamless", "icon_seamless", "meteofrance_seamless",
           "ukmo_seamless", "jma_seamless", "gem_seamless", "cma_grapes_global"]

def praias():
    """lat/lon de cada praia, na ordem de js/praias.js, escritos como o JavaScript escreve (sem zero sobrando no fim)"""
    txt = open(os.path.join(RAIZ, "js", "praias.js"), encoding="utf-8").read()
    txt = txt[:txt.index("window.REGIOES")] if "window.REGIOES" in txt else txt
    ps = re.findall(r'\{\s*id:\s*"([a-z]+)".*?lat:\s*(-?[\d.]+),\s*lon:\s*(-?[\d.]+)', txt)
    num = lambda v: repr(float(v))
    return [(i, num(a), num(o)) for i, a, o in ps]

def urls(ps):
    lat, lon = ",".join(p[1] for p in ps), ",".join(p[2] for p in ps)
    return {
        "tempo": "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
                 "&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,wind_speed_80m,uv_index,uv_index_clear_sky" +
                 "&daily=sunrise,sunset,uv_index_max&timezone=" + FUSO + "&forecast_days=7",
        "nuvens": "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
                  "&hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,wind_speed_10m,wind_direction_10m,precipitation,temperature_2m,direct_normal_irradiance&models=" +
                  ",".join(MODELOS) + "&timezone=" + FUSO + "&forecast_days=7",
        "mar": "https://marine-api.open-meteo.com/v1/marine?latitude=" + lat + "&longitude=" + lon +
               "&hourly=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period,secondary_swell_wave_height,secondary_swell_wave_direction,secondary_swell_wave_period,wind_wave_height,wind_wave_direction,sea_surface_temperature,sea_level_height_msl&timezone=" +
               FUSO + "&forecast_days=7",
    }

def baixar(url, tentativas=5):
    for t in range(tentativas):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Praiometro (robo da previsao)"}), timeout=60) as r:
                return json.loads(r.read())
        except Exception as e:
            print("falhou", url[:60], "->", e); time.sleep(20 * (t + 1))
    return None

if __name__ == "__main__":
    ps = praias()
    if len(ps) < 10: print("não achei as praias em js/praias.js"); sys.exit(1)
    u = urls(ps)
    tempo = baixar(u["tempo"])
    nuvens = baixar(u["nuvens"])
    mar = baixar(u["mar"], tentativas=3)
    # sem a previsão base ou sem os modelos, não publica nada (o arquivo antigo fica, e o app decide pela idade dele)
    if not (isinstance(tempo, list) and len(tempo) == len(ps) and isinstance(nuvens, list) and len(nuvens) == len(ps)):
        print("previsão incompleta: não publico"); sys.exit(1)
    if not (isinstance(mar, list) and len(mar) == len(ps)): mar = None      # sem o mar, o app pede o mar direto
    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    dados = {"geradoEm": int(time.time() * 1000), "praias": [p[0] for p in ps], "urls": u, "tempo": tempo, "nuvens": nuvens, "mar": mar}
    json.dump(dados, open(SAIDA, "w", encoding="utf-8"), separators=(",", ":"))
    print("previsão publicada:", len(ps), "praias,", round(os.path.getsize(SAIDA) / 1e6, 2), "MB", "(sem o mar)" if mar is None else "")

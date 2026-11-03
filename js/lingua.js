// Praiômetro — troca de língua (português, inglês, espanhol, francês).
// O app é escrito em português; aqui a gente traduz o texto que aparece na tela, pedaço por pedaço.
// Números viram "#" na busca (ex.: "Sol das 10h às 14h" -> "Sol das #h às #h") e voltam no lugar na tradução.
// Frases compostas são quebradas em " · ", ". ", ", " e ": " e cada pedaço é traduzido.
// Nome de praia, de posto e de metrô fica como está.
(function () {
  "use strict";
  const LINGUAS = [["pt", "Português", "PT"], ["en", "English", "EN"], ["es", "Español", "ES"], ["fr", "Français", "FR"]];
  // [português, inglês, espanhol, francês]
  const FRASES = [
    // ---- topo, busca, botões da página principal
    ["Busque sua praia", "Search your beach", "Busca tu playa", "Cherchez votre plage"],
    ["Minhas praias favoritas", "My favorite beaches", "Mis playas favoritas", "Mes plages favorites"],
    ["Minhas praias", "My beaches", "Mis playas", "Mes plages"],
    ["Surfe", "Surf", "Surf", "Surf"],
    ["Ondas, período, vento e maré", "Waves, period, wind and tide", "Olas, período, viento y marea", "Vagues, période, vent et marée"],
    ["Treino cedo", "Early workout", "Entreno temprano", "Sport du matin"],
    ["Vai treinar cedo? Veja se dá jogo", "Working out early? See if it's on", "¿Entrenas temprano? Mira si se puede", "Sport tôt ? Voyez si c'est jouable"],
    ["Seus treinos: veja como vai estar", "Your workouts: see the conditions", "Tus entrenos: mira cómo estará", "Vos séances : voyez les conditions"],
    ["Dia da previsão", "Forecast day", "Día del pronóstico", "Jour de la prévision"],
    ["Hoje", "Today", "Hoy", "Aujourd'hui"], ["hoje", "today", "hoy", "aujourd'hui"],
    ["Amanhã", "Tomorrow", "Mañana", "Demain"], ["amanhã", "tomorrow", "mañana", "demain"],
    ["Seg", "Mon", "Lun", "Lun"], ["Ter", "Tue", "Mar", "Mar"], ["Qua", "Wed", "Mié", "Mer"], ["Qui", "Thu", "Jue", "Jeu"],
    ["Sex", "Fri", "Vie", "Ven"], ["Sáb", "Sat", "Sáb", "Sam"], ["Dom", "Sun", "Dom", "Dim"],
    ["segunda", "Monday", "lunes", "lundi"], ["terça", "Tuesday", "martes", "mardi"], ["quarta", "Wednesday", "miércoles", "mercredi"],
    ["quinta", "Thursday", "jueves", "jeudi"], ["sexta", "Friday", "viernes", "vendredi"], ["sábado", "Saturday", "sábado", "samedi"],
    ["domingo", "Sunday", "domingo", "dimanche"],
    ["Região", "Area", "Zona", "Zone"], ["Tudo", "All", "Todo", "Tout"], ["Zona Sul", "South Zone", "Zona Sur", "Zone Sud"],
    ["Zona Oeste", "West Zone", "Zona Oeste", "Zone Ouest"], ["Niterói", "Niterói", "Niterói", "Niterói"],
    ["Fechar", "Close", "Cerrar", "Fermer"], ["Voltar", "Back", "Volver", "Retour"], ["Voltar para a lista", "Back to the list", "Volver a la lista", "Retour à la liste"],
    ["Compartilhar", "Share", "Compartir", "Partager"], ["Favoritar", "Add to favorites", "Agregar a favoritos", "Ajouter aux favoris"],
    ["Favorita", "Favorite", "Favorita", "Favorite"], ["favorita", "favorite", "favorita", "favorite"],
    ["Previsão atualizada às #h#", "Forecast updated at #h#", "Pronóstico actualizado a las #h#", "Prévision mise à jour à #h#"],
    ["Previsão atualizada às", "Forecast updated at", "Pronóstico actualizado a las", "Prévision mise à jour à"],
    ["Previsão completa ›", "Full forecast ›", "Pronóstico completo ›", "Prévision complète ›"],
    ["Ver previsão completa da praia ›", "See the beach's full forecast ›", "Ver el pronóstico completo de la playa ›", "Voir la prévision complète de la plage ›"],
    ["Previsão de hoje", "Today's forecast", "Pronóstico de hoy", "Prévision du jour"],
    ["Previsão de", "Forecast for", "Pronóstico de", "Prévision de"], ["Previsão às", "Forecast at", "Pronóstico a las", "Prévision à"],
    ["Previsão:", "Forecast:", "Pronóstico:", "Prévision :"],
    ["Melhor praia", "Best beach", "Mejor playa", "Meilleure plage"], ["Melhor praia {D}", "Best beach {D}", "Mejor playa {D}", "Meilleure plage {D}"],
    ["Melhor praia hoje", "Best beach today", "Mejor playa hoy", "Meilleure plage aujourd'hui"],
    ["Melhor praia amanhã", "Best beach tomorrow", "Mejor playa mañana", "Meilleure plage demain"],
    ["Praias hoje", "Beaches today", "Playas hoy", "Plages aujourd'hui"], ["Praias amanhã", "Beaches tomorrow", "Playas mañana", "Plages demain"],
    ["Praias {D}", "Beaches {D}", "Playas {D}", "Plages {D}"],
    ["As melhores primeiro", "Best first", "Las mejores primero", "Les meilleures d'abord"],
    ["céu das #h às #h", "sky from #h to #h", "cielo de #h a #h", "ciel de #h à #h"],
    ["Escolha pelo pedaço da praia", "Pick by stretch of beach", "Elige por tramo de playa", "Choisissez par partie de plage"],
    ["Navegar pela orla", "Browse the shoreline", "Recorrer la costa", "Parcourir le littoral"],
    ["Praia anterior na orla", "Previous beach on the shore", "Playa anterior en la costa", "Plage précédente"],
    ["Próxima praia na orla", "Next beach on the shore", "Siguiente playa en la costa", "Plage suivante"],
    ["Próxima praia na orla:", "Next beach on the shore:", "Siguiente playa en la costa:", "Plage suivante :"],
    ["Favorita anterior", "Previous favorite", "Favorita anterior", "Favorite précédente"], ["Próxima favorita", "Next favorite", "Siguiente favorita", "Favorite suivante"],
    ["Próxima favorita:", "Next favorite:", "Siguiente favorita:", "Favorite suivante :"],
    ["Nenhuma praia favorita ainda", "No favorite beaches yet", "Aún no hay playas favoritas", "Aucune plage favorite pour l'instant"],
    ["Ele aparece aqui", "It shows up here", "Aparece aquí", "Elle apparaît ici"], ["Ela aparece aqui", "It shows up here", "Aparece aquí", "Elle apparaît ici"],
    ["Abra uma praia e toque em", "Open a beach and tap", "Abre una playa y toca", "Ouvrez une plage et touchez"],
    ["Abra um pico e toque em", "Open a surf spot and tap", "Abre un pico y toca", "Ouvrez un spot et touchez"],
    ["Qual praia do Rio e de Niterói vale hoje", "Which Rio and Niterói beach is worth it today", "Qué playa de Río y Niterói vale la pena hoy", "Quelle plage de Rio et Niterói vaut le coup aujourd'hui"],
    ["Resumo do dia", "Day summary", "Resumen del día", "Résumé du jour"],
    ["Hora a hora", "Hour by hour", "Hora a hora", "Heure par heure"], ["hora a hora", "hour by hour", "hora a hora", "heure par heure"],
    ["Toque para ver o detalhe hora a hora", "Tap to see hour by hour", "Toca para ver hora a hora", "Touchez pour voir heure par heure"],
    // ---- céu, sol, chuva
    ["Sol", "Sun", "Sol", "Soleil"], ["sol", "sun", "sol", "soleil"], ["Solzão", "Full sun", "Solazo", "Grand soleil"],
    ["Sol entre nuvens", "Sun and clouds", "Sol entre nubes", "Soleil voilé"], ["Entre nuvens", "Partly cloudy", "Parcialmente nublado", "Éclaircies"],
    ["Nublado", "Cloudy", "Nublado", "Nuageux"], ["Chuva", "Rain", "Lluvia", "Pluie"], ["chuva", "rain", "lluvia", "pluie"],
    ["Sem sol", "No sun", "Sin sol", "Sans soleil"], ["Sem sol firme", "No steady sun", "Sin sol firme", "Pas de vrai soleil"],
    ["Sem sol firme hoje", "No steady sun today", "Sin sol firme hoy", "Pas de vrai soleil aujourd'hui"],
    ["#h sol", "#h sun", "#h sol", "#h soleil"], ["#h entre nuvens", "#h partly cloudy", "#h parcialmente nublado", "#h éclaircies"],
    ["#h nublado", "#h cloudy", "#h nublado", "#h nuageux"], ["#h chuva", "#h rain", "#h lluvia", "#h pluie"], ["#h sem sol", "#h no sun", "#h sin sol", "#h sans soleil"],
    ["#h: Sol", "#h: Sun", "#h: Sol", "#h : Soleil"], ["#h: Entre nuvens", "#h: Partly cloudy", "#h: Parcialmente nublado", "#h : Éclaircies"],
    ["#h: Chuva", "#h: Rain", "#h: Lluvia", "#h : Pluie"], ["#h: Sem sol", "#h: No sun", "#h: Sin sol", "#h : Sans soleil"], ["#h: Nublado", "#h: Cloudy", "#h: Nublado", "#h : Nuageux"],
    ["Sol #h–#h", "Sun #h–#h", "Sol #h–#h", "Soleil #h–#h"], ["Sol das #h às #h", "Sun from #h to #h", "Sol de #h a #h", "Soleil de #h à #h"],
    ["Solzão das #h às #h", "Full sun from #h to #h", "Solazo de #h a #h", "Grand soleil de #h à #h"], ["Solzão das", "Full sun from", "Solazo de", "Grand soleil de"],
    ["Sol firme das #h às #h", "Steady sun from #h to #h", "Sol firme de #h a #h", "Vrai soleil de #h à #h"],
    ["Sol só das", "Sun only from", "Sol solo de", "Soleil seulement de"], ["depois fecha", "then clouds over", "luego se nubla", "puis ça se couvre"],
    ["Céu limpo das #h às #h", "Clear sky from #h to #h", "Cielo despejado de #h a #h", "Ciel dégagé de #h à #h"], ["Céu limpo das", "Clear sky from", "Cielo despejado de", "Ciel dégagé de"],
    ["céu limpo", "clear sky", "cielo despejado", "ciel dégagé"], ["Céu fechado", "Overcast", "Cielo cubierto", "Ciel couvert"],
    ["Céu fechado o dia todo", "Overcast all day", "Cielo cubierto todo el día", "Ciel couvert toute la journée"],
    ["Céu hora a hora", "Sky hour by hour", "Cielo hora a hora", "Ciel heure par heure"],
    ["Dia de praia raiz!", "A proper beach day!", "¡Día de playa de verdad!", "Vraie journée de plage !"],
    ["Dia de praião", "Great beach day", "Día de playa top", "Super journée de plage"],
    ["Hoje é dia de praião!", "Today is a great beach day!", "¡Hoy es día de playa top!", "Aujourd'hui, super journée de plage !"],
    ["Amanhã é dia de praião!", "Tomorrow is a great beach day!", "¡Mañana es día de playa top!", "Demain, super journée de plage !"],
    ["é dia de praião!", "is a great beach day!", "es día de playa top!", "super journée de plage !"],
    ["# praias com solzão e vento tranquilo", "# beaches with full sun and light wind", "# playas con solazo y poco viento", "# plages avec grand soleil et vent calme"],
    ["praias com solzão e vento tranquilo", "beaches with full sun and light wind", "playas con solazo y poco viento", "plages avec grand soleil et vent calme"],
    ["Dia de chuva", "Rainy day", "Día de lluvia", "Journée pluvieuse"], ["Chuva em boa parte do dia", "Rain for much of the day", "Lluvia buena parte del día", "Pluie une bonne partie de la journée"],
    ["Chance alta de chuva a partir das #h", "High chance of rain from #h", "Alta probabilidad de lluvia desde las #h", "Forte risque de pluie à partir de #h"],
    ["Chance alta de chuva a partir das", "High chance of rain from", "Alta probabilidad de lluvia desde las", "Forte risque de pluie à partir de"],
    ["Sem chance alta de chuva", "No high chance of rain", "Sin alta probabilidad de lluvia", "Pas de fort risque de pluie"],
    ["Hoje tem praião o dia todo!", "Beach day all day today!", "¡Hoy es día de playa todo el día!", "Journée plage toute la journée aujourd'hui !"],
    ["Hoje tem praião, mais pela manhã!", "Beach day today, best in the morning!", "¡Hoy es día de playa, mejor por la mañana!", "Journée plage aujourd'hui, surtout le matin !"],
    ["Hoje tem praião, mais à tarde!", "Beach day today, best in the afternoon!", "¡Hoy es día de playa, mejor por la tarde!", "Journée plage aujourd'hui, surtout l'après-midi !"],
    ["Hoje tem praião com visitas de algumas nuvens!", "Beach day today, with a few passing clouds!", "¡Hoy es día de playa, con algunas nubes de paso!", "Journée plage aujourd'hui, avec quelques nuages de passage !"],
    ["Amanhã tem praião o dia todo!", "Beach day all day tomorrow!", "¡Mañana es día de playa todo el día!", "Journée plage toute la journée demain !"],
    ["Amanhã tem praião, mais pela manhã!", "Beach day tomorrow, best in the morning!", "¡Mañana es día de playa, mejor por la mañana!", "Journée plage demain, surtout le matin !"],
    ["Amanhã tem praião, mais à tarde!", "Beach day tomorrow, best in the afternoon!", "¡Mañana es día de playa, mejor por la tarde!", "Journée plage demain, surtout l'après-midi !"],
    ["Amanhã tem praião com visitas de algumas nuvens!", "Beach day tomorrow, with a few passing clouds!", "¡Mañana es día de playa, con algunas nubes de paso!", "Journée plage demain, avec quelques nuages de passage !"],
    ["# praias com sol e vento tranquilo", "# beaches with sun and light wind", "# playas con sol y viento suave", "# plages avec soleil et vent léger"],
    ["{D} tem praião o dia todo!", "{D}: beach day all day!", "{D}: ¡día de playa todo el día!", "{D} : journée plage toute la journée !"],
    ["{D} tem praião, mais pela manhã!", "{D}: beach day, best in the morning!", "{D}: ¡día de playa, mejor por la mañana!", "{D} : journée plage, surtout le matin !"],
    ["{D} tem praião, mais à tarde!", "{D}: beach day, best in the afternoon!", "{D}: ¡día de playa, mejor por la tarde!", "{D} : journée plage, surtout l'après-midi !"],
    ["{D} tem praião com visitas de algumas nuvens!", "{D}: beach day, with a few passing clouds!", "{D}: ¡día de playa, con algunas nubes de paso!", "{D} : journée plage, avec quelques nuages de passage !"],
    ["Sol de manhã, chuva a partir das #h", "Sunny morning, rain from #h", "Sol por la mañana, lluvia desde las #h", "Soleil le matin, pluie à partir de #h"],
    ["Sol de manhã", "Sunny morning", "Sol por la mañana", "Soleil le matin"],
    ["Chuva a partir das #h", "Rain from #h", "Lluvia desde las #h", "Pluie à partir de #h"],
    ["Sol de manhã, chuva à tarde", "Sunny morning, rainy afternoon", "Sol por la mañana, lluvia por la tarde", "Soleil le matin, pluie l'après-midi"],
    ["Condições", "Conditions", "Condiciones", "Conditions"],
    ["Real", "Actual", "Real", "Réelle"], ["Sensação", "Feels like", "Sensación", "Ressentie"],
    ["A temperatura real.", "The actual temperature.", "La temperatura real.", "La température réelle."],
    ["Como o corpo sente: com calor, a umidade deixa a sensação mais quente.", "How it feels: in the heat, humidity makes it feel hotter.", "Cómo se siente: con calor, la humedad aumenta la sensación.", "Ce que ressent le corps : par temps chaud, l'humidité accentue la chaleur."],
    ["Chance de chuva", "Chance of rain", "Probabilidad de lluvia", "Risque de pluie"],
    ["Maior chance no dia: #%", "Highest chance today: #%", "Mayor probabilidad del día: #%", "Risque maximal du jour : #%"],
    ["Cada coluna é uma hora. A chance é quantos dos 9 modelos de previsão põem chuva naquela hora. Arraste nos gráficos para ver cada horário.", "Each column is one hour. The chance is how many of the 9 forecast models show rain at that hour. Drag on the charts to see each hour.", "Cada columna es una hora. La probabilidad es cuántos de los 9 modelos prevén lluvia a esa hora. Arrastra en los gráficos para ver cada hora.", "Chaque colonne est une heure. Le risque correspond au nombre des 9 modèles qui prévoient de la pluie à cette heure. Faites glisser sur les graphiques pour voir chaque heure."],
    ["MÍN", "LOW", "MÍN", "MIN"], ["MÁX", "HIGH", "MÁX", "MAX"],
    ["Favoritas", "Favorites", "Favoritas", "Favoris"], ["Suas praias salvas", "Your saved beaches", "Tus playas guardadas", "Vos plages enregistrées"],
    ["Ondas e vento", "Waves and wind", "Olas y viento", "Vagues et vent"], ["Dá jogo amanhã?", "Game on tomorrow?", "¿Se puede mañana?", "Jouable demain ?"],
    ["Trajeto do sol", "Sun path", "Recorrido del sol", "Course du soleil"], ["Câmera no céu", "Camera to the sky", "Cámara al cielo", "Caméra vers le ciel"], ["NOVO", "NEW", "NUEVO", "NOUVEAU"],
    ["Quer saber antes quando vai ter praião?", "Want to know ahead when it's a beach day?", "¿Quieres saber antes cuándo habrá día de playa?", "Envie de savoir à l'avance quand ce sera jour de plage ?"],
    ["Todo dia a gente olha a previsão de todas as praias do Rio e de Niterói. Quando vier dia bom de verdade, você fica sabendo antes de todo mundo.", "Every day we check the forecast for every beach in Rio and Niterói. When a truly great day is coming, you'll know before everyone else.", "Cada día revisamos el pronóstico de todas las playas de Río y Niterói. Cuando venga un día bueno de verdad, te enteras antes que nadie.", "Chaque jour, nous vérifions la météo de toutes les plages de Rio et Niterói. Quand une vraie belle journée arrive, vous le savez avant tout le monde."],
    ["3 dias antes", "3 days ahead", "3 días antes", "3 jours avant"],
    ["\"A princípio, sábado tem praião!\"", "\"Looks like Saturday is a beach day!\"", "\"¡En principio, el sábado hay playa!\"", "\"A priori, samedi c'est plage !\""],
    ["Na véspera, no fim da tarde", "The day before, late afternoon", "La víspera, al final de la tarde", "La veille, en fin d'après-midi"],
    ["A gente confirma ou avisa se mudou.", "We confirm, or tell you if it changed.", "Confirmamos o avisamos si cambió.", "On confirme, ou on prévient si ça change."],
    ["Sem spam", "No spam", "Sin spam", "Pas de spam"],
    ["Só chega aviso em dia de praião. Dá pra desligar quando quiser, aqui no app.", "You only get alerts on beach days. Turn them off anytime, right here in the app.", "Solo llegan avisos en días de playa. Puedes desactivarlos cuando quieras, aquí en la app.", "Vous ne recevez d'alertes que les jours de plage. Désactivables à tout moment, ici dans l'app."],
    ["☀️ Quero ser avisado", "☀️ Notify me", "☀️ Quiero que me avisen", "☀️ Prévenez-moi"], ["Agora não", "Not now", "Ahora no", "Pas maintenant"], ["Fechar", "Close", "Cerrar", "Fermer"],
    ["Pronto! Quando vier praião, você fica sabendo. ☀️", "Done! When a beach day is coming, you'll know. ☀️", "¡Listo! Cuando venga día de playa, te enteras. ☀️", "C'est fait ! Quand une journée plage arrive, vous serez prévenu. ☀️"],
    ["Natação", "Swimming", "Natación", "Natation"], ["Ótimo pra nadar", "Great for swimming", "Ideal para nadar", "Idéal pour nager"], ["Ruim pra nadar", "Bad for swimming", "Malo para nadar", "Mauvais pour nager"],
    ["Mar calmo e pouco vento.", "Calm sea and little wind.", "Mar calmo y poco viento.", "Mer calme et peu de vent."],
    ["ondas grandes", "big waves", "olas grandes", "grosses vagues"], ["mar mexido", "choppy sea", "mar movido", "mer agitée"], ["marola do vento", "wind chop", "oleaje del viento", "clapot du vent"],
    ["água imprópria", "unsafe water", "agua no apta", "eau impropre"], ["água gelada", "cold water", "agua fría", "eau froide"],
    ["ondas", "waves", "olas", "vagues"], ["água", "water", "agua", "eau"], ["Própria", "Safe", "Apta", "Propre"], ["Imprópria", "Unsafe", "No apta", "Impropre"],
    ["Hora a hora · ondas na praia", "Hour by hour · waves at the beach", "Hora a hora · olas en la playa", "Heure par heure · vagues sur la plage"],
    ["Natação: ondas boas até # m · atrapalham até # m · acima disso, ruim. Vento acima de # km/h faz marola.", "Swimming: waves fine up to # m · get in the way up to # m · above that, bad. Wind above # km/h makes chop.", "Natación: olas buenas hasta # m · molestan hasta # m · más que eso, malo. Viento sobre # km/h hace oleaje.", "Natation : vagues bonnes jusqu'à # m · gênantes jusqu'à # m · au-delà, mauvais. Vent au-dessus de # km/h = clapot."],
    ["Como estava o mar pra nadar hoje às #h?", "How was the sea for swimming today at #h?", "¿Cómo estuvo el mar para nadar hoy a las #h?", "Comment était la mer pour nager aujourd'hui à #h ?"],
    ["Da maior nota pra menor · barrinhas: céu das 6h às 20h", "Highest score first · bars: sky from 6am to 8pm", "De la mayor nota a la menor · barras: cielo de 6h a 20h", "De la meilleure note à la moins bonne · barres : ciel de 6h à 20h"],
    ["pesado", "rough", "fuerte", "forte"], ["nota", "score", "nota", "note"],
    ["🌅 Nascer", "🌅 Sunrise", "🌅 Amanecer", "🌅 Lever"], ["☀️ Sol na areia", "☀️ Sun on the sand", "☀️ Sol en la arena", "☀️ Soleil sur le sable"], ["🌇 Pôr do sol", "🌇 Sunset", "🌇 Atardecer", "🌇 Coucher"],
    ["Depois disso, sombra do morro (trecho cinza do arco).", "After that, shade from the hill (gray part of the arc).", "Después, sombra del cerro (tramo gris del arco).", "Ensuite, ombre de la colline (partie grise de l'arc)."],
    ["Depois disso, sombra dos prédios (trecho cinza do arco).", "After that, shade from the buildings (gray part of the arc).", "Después, sombra de los edificios (tramo gris del arco).", "Ensuite, ombre des immeubles (partie grise de l'arc)."],
    ["Pôr do sol: boa chance de céu colorido", "Sunset: good chance of a colorful sky", "Atardecer: buena chance de cielo colorido", "Coucher : bonne chance de ciel coloré"],
    ["Pôr do sol: céu limpo, cores suaves", "Sunset: clear sky, soft colors", "Atardecer: cielo limpio, colores suaves", "Coucher : ciel dégagé, couleurs douces"],
    ["Pôr do sol: as nuvens devem esconder", "Sunset: clouds will probably hide it", "Atardecer: las nubes lo taparán", "Coucher : les nuages devraient le cacher"],
    ["Como chegar", "How to get there", "Cómo llegar", "Comment y aller"], ["De metrô · escolha pelo pedaço da praia", "By subway · pick by part of the beach", "En metro · elige por el tramo de playa", "En métro · choisissez selon la partie de la plage"],
    ["min a pé", "min walk", "min a pie", "min à pied"],
    ["previsão incerta", "uncertain forecast", "pronóstico incierto", "prévision incertaine"],
    ["Coloque o Praiômetro na sua tela de início", "Add Praiômetro to your home screen", "Pon Praiômetro en tu pantalla de inicio", "Ajoutez Praiômetro à votre écran d'accueil"],
    ["Ele abre como app, em tela cheia, sem barra do navegador, e pode te avisar quando vai ter praião. Leva 10 segundos:", "It opens like an app, full screen, with no browser bar, and can alert you about beach days. Takes 10 seconds:", "Se abre como app, a pantalla completa, sin barra del navegador, y te avisa cuando habrá día de playa. Toma 10 segundos:", "Il s'ouvre comme une app, en plein écran, sans barre du navigateur, et peut vous prévenir des jours de plage. 10 secondes :"],
    ["Toque em ••• ou em", "Tap ••• or", "Toca ••• o", "Touchez ••• ou"], ["Na barra do Safari, embaixo da tela.", "On the Safari bar, at the bottom of the screen.", "En la barra de Safari, abajo.", "Dans la barre de Safari, en bas de l'écran."],
    ["Compartilhar → Adicionar à Tela de Início", "Share → Add to Home Screen", "Compartir → Agregar a pantalla de inicio", "Partager → Sur l'écran d'accueil"], ["Se não aparecer, role a lista pra baixo.", "If you don't see it, scroll the list down.", "Si no aparece, desliza la lista hacia abajo.", "Si vous ne le voyez pas, faites défiler la liste."],
    ["Deixe \"Abrir como App Web\" ligado", "Keep \"Open as Web App\" on", "Deja \"Abrir como app web\" activado", "Laissez « Ouvrir comme app Web » activé"], ["E toque em Adicionar.", "And tap Add.", "Y toca Agregar.", "Et touchez Ajouter."],
    ["Abra pelo ícone novo 🏝️", "Open it from the new icon 🏝️", "Ábrelo desde el nuevo ícono 🏝️", "Ouvrez-le depuis la nouvelle icône 🏝️"], ["Pronto, já é um app.", "Done, it's an app now.", "Listo, ya es una app.", "Voilà, c'est une app."],
    ["Entendi, vou fazer", "Got it", "Entendido", "Compris"], ["Instalar agora", "Install now", "Instalar ahora", "Installer"],
    ["Toque em Adicionar", "Tap Add", "Toca Agregar", "Touchez Ajouter"], ["Só se aparecer a opção \"Abrir como App Web\", deixe ligada.", "Only if you see \"Open as Web App\", keep it on.", "Solo si aparece \"Abrir como app web\", déjalo activado.", "Seulement si « Ouvrir comme app Web » apparaît, laissez-le activé."],
    ["com chance de pancada de chuva às #h", "with a chance of a rain shower at #h", "con probabilidad de chubasco a las #h", "avec risque d'averse à #h"],
    ["com chance de pancada de chuva às", "with a chance of a rain shower at", "con probabilidad de chubasco a las", "avec risque d'averse à"],
    ["com chance de pancada às #h", "with a chance of a shower at #h", "con probabilidad de chubasco a las #h", "avec risque d'averse à #h"],
    ["com chance de pancada às", "with a chance of a shower at", "con probabilidad de chubasco a las", "avec risque d'averse à"],
    ["chance de chuva", "chance of rain", "probabilidad de lluvia", "risque de pluie"], ["Chuva #%", "Rain #%", "Lluvia #%", "Pluie #%"],
    ["Nuvens #%", "Clouds #%", "Nubes #%", "Nuages #%"], ["Máxima de #°", "High of #°", "Máxima de #°", "Max #°"], ["Máxima de", "High of", "Máxima de", "Max"],
    ["Entre # e # °C no dia", "Between # and # °C during the day", "Entre # y # °C en el día", "Entre # et # °C dans la journée"],
    ["Altura da barra", "Bar height", "Altura de la barra", "Hauteur de la barre"], ["temperatura", "temperature", "temperatura", "température"],
    ["número azul", "blue number", "número azul", "chiffre bleu"],
    ["Sem dado da temperatura", "No temperature data", "Sin datos de temperatura", "Pas de donnée de température"],
    // ---- UV
    ["Índice UV", "UV index", "Índice UV", "Indice UV"], ["Índice UV hora a hora", "UV index hour by hour", "Índice UV hora a hora", "Indice UV heure par heure"],
    ["UV hora a hora", "UV hour by hour", "UV hora a hora", "UV heure par heure"], ["UV #", "UV #", "UV #", "UV #"],
    ["UV alto", "High UV", "UV alto", "UV élevé"], ["UV moderado", "Moderate UV", "UV moderado", "UV modéré"],
    ["Leve", "Low", "Bajo", "Faible"], ["Moderado", "Moderate", "Moderado", "Modéré"], ["Alto", "High", "Alto", "Élevé"],
    ["Muito alto", "Very high", "Muy alto", "Très élevé"], ["Extremo", "Extreme", "Extremo", "Extrême"],
    ["Dia de bronze", "Tanning day", "Día de bronceado", "Journée bronzage"],
    ["Pico das #h às #h", "Peak from #h to #h", "Pico de #h a #h", "Pic de #h à #h"], ["Pico do UV das #h às #h", "UV peak from #h to #h", "Pico de UV de #h a #h", "Pic d'UV de #h à #h"],
    ["Pico do UV", "UV peak", "Pico de UV", "Pic d'UV"], ["agora UV #", "now UV #", "ahora UV #", "maintenant UV #"],
    ["protetor a cada #h", "sunscreen every #h", "protector cada #h", "crème solaire toutes les #h"],
    ["queima mesmo nublado", "burns even when cloudy", "quema aunque esté nublado", "ça brûle même nuageux"],
    ["Sem UV alto no dia", "No high UV today", "Sin UV alto en el día", "Pas d'UV élevé dans la journée"],
    ["UV alto ou mais das #h às #h", "High UV or more from #h to #h", "UV alto o más de #h a #h", "UV élevé ou plus de #h à #h"],
    ["Risco baixo para a pele", "Low risk for the skin", "Riesgo bajo para la piel", "Risque faible pour la peau"],
    ["Pouco risco de queimar", "Little risk of sunburn", "Poco riesgo de quemarse", "Peu de risque de coup de soleil"],
    ["Queima rápido", "Burns fast", "Quema rápido", "Ça brûle vite"], ["Use protetor solar", "Use sunscreen", "Usa protector solar", "Mettez de la crème solaire"],
    ["Protetor FPS # e reaplique sempre", "SPF # sunscreen, reapply often", "Protector FPS # y reaplica siempre", "Crème SPF #, à remettre souvent"],
    ["Protetor", "Sunscreen", "Protector", "Crème solaire"], ["chapéu e óculos", "hat and sunglasses", "sombrero y gafas", "chapeau et lunettes"],
    ["proteção máxima", "maximum protection", "protección máxima", "protection maximale"],
    ["evite o sol do meio-dia", "avoid the midday sun", "evita el sol del mediodía", "évitez le soleil de midi"],
    ["· evite o sol do meio-dia", "· avoid the midday sun", "· evita el sol del mediodía", "· évitez le soleil de midi"],
    // ---- vento
    ["Vento fraco", "Light wind", "Viento suave", "Vent faible"], ["Brisa", "Breeze", "Brisa", "Brise"], ["Vento moderado", "Moderate wind", "Viento moderado", "Vent modéré"],
    ["Ventania", "Strong wind", "Ventarrón", "Grand vent"], ["ventania", "strong wind", "ventarrón", "grand vent"], ["ventando", "windy", "ventoso", "venteux"],
    ["vento", "wind", "viento", "vent"], ["vento forte", "strong wind", "viento fuerte", "vent fort"], ["vento moderado", "moderate wind", "viento moderado", "vent modéré"],
    ["Brisa às #h", "Breeze at #h", "Brisa a las #h", "Brise à #h"], ["Vento fraco a partir das #h", "Light wind from #h", "Viento suave desde las #h", "Vent faible à partir de #h"],
    ["Sem horário de vento fraco", "No light-wind hours", "Sin horas de viento suave", "Pas d'heure de vent faible"],
    ["Vento hora a hora", "Wind hour by hour", "Viento hora a hora", "Vent heure par heure"],
    ["Agora # km/h", "Now # km/h", "Ahora # km/h", "Maintenant # km/h"], ["Até # km/h (#h)", "Up to # km/h (#h)", "Hasta # km/h (#h)", "Jusqu'à # km/h (#h)"],
    ["chega a # às #h", "reaches # at #h", "llega a # a las #h", "atteint # à #h"], ["guarda-sol firme", "umbrella stays put", "sombrilla firme", "le parasol tient"],
    ["· guarda-sol firme", "· umbrella stays put", "· sombrilla firme", "· le parasol tient"],
    ["finca bem o guarda-sol", "dig the umbrella in well", "clava bien la sombrilla", "plantez bien le parasol"],
    ["· finca bem o guarda-sol", "· dig the umbrella in well", "· clava bien la sombrilla", "· plantez bien le parasol"],
    ["areia voando", "sand blowing", "arena volando", "sable qui vole"], ["dia de altinha", "keepy-uppy day", "día de altinha", "jour d'altinha"],
    ["· dia de altinha", "· keepy-uppy day", "· día de altinha", "· jour d'altinha"],
    ["Mais forte às #h", "Strongest at #h", "Más fuerte a las #h", "Plus fort à #h"], ["Mais forte às", "Strongest at", "Más fuerte a las", "Plus fort à"],
    ["rajadas de # km/h", "gusts of # km/h", "ráfagas de # km/h", "rafales de # km/h"], ["rajada km/h", "gust km/h", "ráfaga km/h", "rafale km/h"],
    ["vento km/h", "wind km/h", "viento km/h", "vent km/h"], ["Direção", "Direction", "Dirección", "Direction"],
    ["vento aumentando lá pelas", "wind picking up around", "el viento aumenta hacia las", "le vent forcit vers"],
    ["Sem dado do vento", "No wind data", "Sin datos de viento", "Pas de donnée de vent"],
    ["Fraco", "Light", "Suave", "Faible"], ["Terral", "Offshore", "Terral", "Offshore"], ["Maral", "Onshore", "Marero", "Onshore"], ["Lateral", "Cross-shore", "Lateral", "Side-shore"],
    // ---- mar e ondas
    ["Mar liso", "Flat sea", "Mar plano", "Mer plate"], ["Piscininha", "Like a pool", "Piscinita", "Comme une piscine"], ["piscininha", "like a pool", "piscinita", "comme une piscine"],
    ["Calminho", "Calm", "Calmito", "Calme"], ["calminho", "calm", "calmito", "calme"], ["Marolinha", "Small waves", "Olitas", "Petites vagues"],
    ["Mar mexido", "Choppy sea", "Mar movido", "Mer agitée"], ["Mexido", "Choppy", "Movido", "Agitée"], ["mexido", "choppy", "movido", "agitée"],
    ["Pesado", "Rough", "Pesado", "Forte"], ["mar", "sea", "mar", "mer"], ["mar calminho", "calm sea", "mar calmito", "mer calme"],
    ["mar mexido", "choppy sea", "mar movido", "mer agitée"], ["mar pesado", "rough sea", "mar pesado", "mer forte"], ["mar piscininha", "pool-like sea", "mar piscinita", "mer d'huile"],
    ["mar tranquilo", "calm sea", "mar tranquilo", "mer calme"], ["Mar de baía", "Bay water", "Mar de bahía", "Eau de baie"],
    ["Dentro da baía o mar fica calmo", "Inside the bay the sea stays calm", "Dentro de la bahía el mar está calmo", "Dans la baie, la mer reste calme"],
    ["Ondas de # m", "Waves of # m", "Olas de # m", "Vagues de # m"], ["ondas de # m", "waves of # m", "olas de # m", "vagues de # m"],
    ["Ondas de", "Waves of", "Olas de", "Vagues de"], ["ondas de", "waves of", "olas de", "vagues de"], ["ondas de até", "waves up to", "olas de hasta", "vagues jusqu'à"],
    ["Mar liso, ondas de # m", "Flat sea, waves of # m", "Mar plano, olas de # m", "Mer plate, vagues de # m"],
    ["Ondas", "Waves", "Olas", "Vagues"], ["ondas", "waves", "olas", "vagues"], ["Ondas hora a hora", "Waves hour by hour", "Olas hora a hora", "Vagues heure par heure"],
    ["Maior às #h", "Biggest at #h", "Mayor a las #h", "Plus grosses à #h"], ["Maior às", "Biggest at", "Mayor a las", "Plus grosses à"],
    ["Menor às #h", "Smallest at #h", "Menor a las #h", "Plus petites à #h"], ["Menor às", "Smallest at", "Menor a las", "Plus petites à"],
    ["Onda pra surfar", "Surfable waves", "Olas para surfear", "Vagues surfables"], ["cuidado com a correnteza", "watch out for currents", "cuidado con la corriente", "attention aux courants"],
    ["dá pra nadar", "good for swimming", "se puede nadar", "baignade possible"], ["de verdade", "for real", "de verdad", "pour de vrai"],
    ["Sem dado do mar agora", "No sea data right now", "Sin datos del mar ahora", "Pas de donnée de mer pour l'instant"],
    ["Sem previsão de ondas agora", "No wave forecast right now", "Sin pronóstico de olas ahora", "Pas de prévision de vagues pour l'instant"],
    ["Sem previsão de ondas pra este dia", "No wave forecast for this day", "Sin pronóstico de olas para este día", "Pas de prévision de vagues ce jour-là"],
    ["Ondulação", "Swell", "Mar de fondo", "Houle"], ["ondulação", "swell", "mar de fondo", "houle"], ["período", "period", "período", "période"],
    ["altura e período", "height and period", "altura y período", "hauteur et période"], ["altura das ondas", "wave height", "altura de las olas", "hauteur des vagues"],
    ["Cor e linhas brancas", "Color and white lines", "Color y líneas blancas", "Couleur et lignes blanches"], ["setas", "arrows", "flechas", "flèches"],
    ["para onde a ondulação vai", "where the swell is heading", "hacia dónde va el mar de fondo", "où va la houle"],
    ["Seta azul", "Blue arrow", "Flecha azul", "Flèche bleue"], ["número", "number", "número", "chiffre"],
    ["Mapa da ondulação no mar", "Swell map", "Mapa del mar de fondo", "Carte de la houle"],
    ["Mapa do mar com a previsão de cada pico", "Sea map with each spot's forecast", "Mapa del mar con el pronóstico de cada pico", "Carte de la mer avec la prévision de chaque spot"],
    ["Carregando a ondulação…", "Loading the swell…", "Cargando el mar de fondo…", "Chargement de la houle…"],
    ["Não consegui carregar a ondulação agora", "Couldn't load the swell right now", "No pude cargar el mar de fondo ahora", "Impossible de charger la houle pour l'instant"],
    ["Preparando o contorno da costa… (só na primeira vez)", "Preparing the coastline… (first time only)", "Preparando el contorno de la costa… (solo la primera vez)", "Préparation du littoral… (la première fois seulement)"],
    ["Alto-mar em frente ao Rio:", "Open sea off Rio:", "Alta mar frente a Río:", "Au large de Rio :"], ["alto-mar em frente ao Rio", "open sea off Rio", "alta mar frente a Río", "au large de Rio"],
    ["a orla mostra o abrigo das pedras e ilhas", "the shore shows the shelter of rocks and islands", "la costa muestra el abrigo de rocas e islas", "le littoral montre l'abri des rochers et des îles"],
    ["Atlântico Sul", "South Atlantic", "Atlántico Sur", "Atlantique Sud"], ["Costa do Rio", "Rio coast", "Costa de Río", "Côte de Rio"], ["Toda a costa", "Whole coast", "Toda la costa", "Toute la côte"],
    ["Barra e Recreio", "Barra and Recreio", "Barra y Recreio", "Barra et Recreio"], ["Prainha e Grumari", "Prainha and Grumari", "Prainha y Grumari", "Prainha et Grumari"],
    ["Trecho da costa", "Stretch of coast", "Tramo de costa", "Partie de la côte"], ["Trecho do litoral", "Stretch of coast", "Tramo del litoral", "Partie du littoral"],
    ["Área do mapa", "Map area", "Área del mapa", "Zone de la carte"], ["Ver como", "View as", "Ver como", "Afficher en"], ["Lista", "List", "Lista", "Liste"], ["Picos", "Spots", "Picos", "Spots"],
    ["Meus picos", "My spots", "Mis picos", "Mes spots"], ["Meus picos favoritos", "My favorite spots", "Mis picos favoritos", "Mes spots favoris"],
    ["Favoritar pico", "Add spot to favorites", "Agregar pico a favoritos", "Ajouter le spot aux favoris"],
    ["Nenhum pico favorito ainda", "No favorite spots yet", "Aún no hay picos favoritos", "Aucun spot favori pour l'instant"],
    ["Agora (#h)", "Now (#h)", "Ahora (#h)", "Maintenant (#h)"], ["toque no pico para ver hora a hora", "tap a spot to see hour by hour", "toca el pico para ver hora a hora", "touchez un spot pour voir heure par heure"],
    ["· toque no pico para ver hora a hora", "· tap a spot to see hour by hour", "· toca el pico para ver hora a hora", "· touchez un spot pour voir heure par heure"],
    ["Agora", "Now", "Ahora", "Maintenant"], ["AGORA", "NOW", "AHORA", "MAINTENANT"], ["Condições ›", "Conditions ›", "Condiciones ›", "Conditions ›"],
    ["arraste a linha amarela", "drag the yellow line", "arrastra la línea amarilla", "faites glisser la ligne jaune"],
    // ---- água e balneabilidade
    ["Temperatura da água", "Water temperature", "Temperatura del agua", "Température de l'eau"],
    ["Temperatura na superfície do mar", "Sea surface temperature", "Temperatura en la superficie del mar", "Température à la surface de la mer"],
    ["Água gelada", "Cold water", "Agua fría", "Eau froide"], ["Água quentinha", "Warm water", "Agua tibia", "Eau bonne"], ["Gelada", "Cold", "Fría", "Froide"], ["Quentinha", "Warm", "Tibia", "Bonne"],
    ["#°C, só pra corajoso", "#°C, for the brave only", "#°C, solo para valientes", "#°C, pour les courageux"], ["só pra corajoso", "for the brave only", "solo para valientes", "pour les courageux"],
    ["#°C, dá pra ficar de molho", "#°C, nice to soak in", "#°C, ideal para quedarse en el agua", "#°C, on y reste volontiers"],
    ["dá pra ficar de molho", "nice to soak in", "ideal para quedarse en el agua", "on y reste volontiers"],
    ["Água própria", "Water OK for swimming", "Agua apta", "Eau propre à la baignade"], ["Água imprópria", "Water not safe for swimming", "Agua no apta", "Baignade déconseillée"],
    ["Água imprópria hoje", "Water not safe for swimming today", "Agua no apta hoy", "Baignade déconseillée aujourd'hui"],
    ["água própria", "water OK", "agua apta", "eau propre"], ["água imprópria", "water not safe", "agua no apta", "eau impropre"],
    ["imprópria", "not safe to swim", "no apta", "impropre"], ["impróprio", "not safe", "no apto", "impropre"], ["próprio", "OK", "apto", "propre"],
    ["Própria em # de # pontos", "OK at # of # points", "Apta en # de # puntos", "Propre sur # points sur #"], ["Própria em", "OK at", "Apta en", "Propre sur"],
    ["Ponto #", "Point #", "Punto #", "Point #"], ["Coleta de #/#/#", "Sampled on #/#/#", "Muestra del #/#/#", "Prélèvement du #/#/#"],
    ["Último boletim INEA", "Latest INEA report", "Último boletín del INEA", "Dernier bulletin de l'INEA"],
    ["Balneabilidade", "Water quality", "Calidad del agua", "Qualité de l'eau"], ["Balneabilidade (INEA)", "Water quality (INEA)", "Calidad del agua (INEA)", "Qualité de l'eau (INEA)"],
    ["Boletim do INEA", "INEA report", "Boletín del INEA", "Bulletin de l'INEA"], ["boletins do INEA", "INEA reports", "boletines del INEA", "bulletins de l'INEA"],
    ["Sem boletim do INEA", "No INEA report", "Sin boletín del INEA", "Pas de bulletin de l'INEA"],
    ["O INEA coleta a água toda semana e publica o boletim às quintas", "INEA samples the water every week and publishes on Thursdays", "El INEA toma muestras cada semana y publica los jueves", "L'INEA analyse l'eau chaque semaine et publie le jeudi"],
    ["Depois de chuva forte", "After heavy rain", "Después de lluvia fuerte", "Après une forte pluie"],
    ["a água costuma piorar por até # h", "the water tends to get worse for up to # h", "el agua suele empeorar hasta # h", "l'eau se dégrade souvent jusqu'à # h"],
    ["Ver boletim no site do INEA ›", "See the report on INEA's site ›", "Ver el boletín en el sitio del INEA ›", "Voir le bulletin sur le site de l'INEA ›"],
    // ---- maré e areia
    ["Maré", "Tide", "Marea", "Marée"], ["Maré do dia", "Today's tide", "Marea del día", "Marée du jour"], ["Maré de hora em hora", "Tide hour by hour", "Marea hora a hora", "Marée heure par heure"],
    ["Baixa às #h#", "Low at #h#", "Baja a las #h#", "Basse à #h#"], ["Alta às #h#", "High at #h#", "Alta a las #h#", "Haute à #h#"], ["Alta às #h", "High at #h", "Alta a las #h", "Haute à #h"],
    ["▲ Alta #h#", "▲ High #h#", "▲ Alta #h#", "▲ Haute #h#"], ["▲ Alta #h", "▲ High #h", "▲ Alta #h", "▲ Haute #h"], ["▼ Baixa #h#", "▼ Low #h#", "▼ Baja #h#", "▼ Basse #h#"],
    ["Maré alta às", "High tide at", "Marea alta a las", "Marée haute à"], ["Maré baixa às", "Low tide at", "Marea baja a las", "Marée basse à"], ["Maré às", "Tide at", "Marea a las", "Marée à"],
    ["maré sobe", "tide rising", "marea sube", "la marée monte"], ["maré desce", "tide falling", "marea baja", "la marée descend"],
    ["enchendo até", "rising until", "subiendo hasta", "monte jusqu'à"], ["secando até", "falling until", "bajando hasta", "descend jusqu'à"],
    ["Mais areia das #h às #h", "More sand from #h to #h", "Más arena de #h a #h", "Plus de sable de #h à #h"],
    ["Mais areia das #h às #h e a partir das #h", "More sand from #h to #h and from #h", "Más arena de #h a #h y desde las #h", "Plus de sable de #h à #h et à partir de #h"],
    ["mais areia", "more sand", "más arena", "plus de sable"], ["menos areia", "less sand", "menos arena", "moins de sable"],
    ["Areia", "Sand", "Arena", "Sable"], ["areia", "sand", "arena", "sable"], ["Orla", "Shore", "Costa", "Bord de mer"],
    // ---- sombra e sol na areia
    ["Sol na areia das", "Sun on the sand from", "Sol en la arena de", "Soleil sur le sable de"], ["sol na areia", "sun on the sand", "sol en la arena", "soleil sur le sable"],
    ["na areia", "on the sand", "en la arena", "sur le sable"], ["sombra", "shade", "sombra", "ombre"], ["sombra do morro", "hill shade", "sombra del cerro", "ombre de la colline"],
    ["Depois disso", "After that", "Después de eso", "Ensuite"], ["Depois disso, sombra do morro", "After that, hill shade", "Después, sombra del cerro", "Ensuite, ombre de la colline"],
    ["O sol só chega na areia às", "The sun only reaches the sand at", "El sol solo llega a la arena a las", "Le soleil n'arrive sur le sable qu'à"],
    ["Fica até as", "Stays until", "Se queda hasta las", "Reste jusqu'à"], ["até as", "until", "hasta las", "jusqu'à"], ["atrás do morro", "behind the hill", "detrás del cerro", "derrière la colline"],
    ["atrás dos prédios", "behind the buildings", "detrás de los edificios", "derrière les immeubles"], ["do morro", "of the hill", "del cerro", "de la colline"], ["dos prédios", "of the buildings", "de los edificios", "des immeubles"],
    ["Sombra na areia", "Shade on the sand", "Sombra en la arena", "Ombre sur le sable"],
    ["estimativa com o relevo (Copernicus DEM", "estimate using terrain (Copernicus DEM", "estimación con el relieve (Copernicus DEM", "estimation avec le relief (Copernicus DEM"],
    ["via Open-Meteo) e a altura média dos prédios da orla", "via Open-Meteo) and the average height of seafront buildings", "vía Open-Meteo) y la altura media de los edificios de la costa", "via Open-Meteo) et la hauteur moyenne des immeubles du front de mer"],
    ["Pode errar alguns minutos", "May be off by a few minutes", "Puede fallar por unos minutos", "Peut se tromper de quelques minutes"],
    ["Na faixa de horários", "In the time strip", "En la franja de horarios", "Dans la bande horaire"],
    ["a listra embaixo marca a areia na sombra", "the stripe below marks shade on the sand", "la franja de abajo marca la arena en sombra", "la bande du bas indique le sable à l'ombre"],
    ["Dê zoom para ver a sombra dos prédios", "Zoom in to see building shade", "Haz zoom para ver la sombra de los edificios", "Zoomez pour voir l'ombre des immeubles"],
    ["postos", "lifeguard posts", "puestos", "postes"], ["banheiros 🚻 e chuveiros 🚿", "restrooms 🚻 and showers 🚿", "baños 🚻 y duchas 🚿", "toilettes 🚻 et douches 🚿"],
    ["Toque numa praia para ver o caminho do sol:", "Tap a beach to see the sun's path:", "Toca una playa para ver el camino del sol:", "Touchez une plage pour voir la course du soleil :"],
    ["dê zoom numa praia", "zoom into a beach", "haz zoom en una playa", "zoomez sur une plage"],
    ["Arraste para ver o sol andando no mapa", "Drag to see the sun move on the map", "Arrastra para ver el sol moverse en el mapa", "Faites glisser pour voir le soleil bouger sur la carte"],
    ["Arraste no gráfico para ver cada horário", "Drag on the chart to see each hour", "Arrastra en el gráfico para ver cada hora", "Faites glisser sur le graphique pour voir chaque heure"],
    ["Onde está o sol às", "Where the sun is at", "Dónde está el sol a las", "Où est le soleil à"], ["Veja o trajeto do sol", "See the sun's path", "Mira el recorrido del sol", "Voir la course du soleil"],
    ["Aponte a câmera para o céu", "Point the camera at the sky", "Apunta la cámara al cielo", "Pointez la caméra vers le ciel"],
    ["Nascer do sol", "Sunrise", "Amanecer", "Lever du soleil"], ["nascer", "sunrise", "amanecer", "lever"], ["pôr do sol", "sunset", "atardecer", "coucher du soleil"],
    ["Pôr do sol às #h#", "Sunset at #h#", "Atardecer a las #h#", "Coucher du soleil à #h#"], ["já se pôs", "already set", "ya se puso", "déjà couché"],
    ["boa chance de céu colorido", "good chance of a colorful sky", "buena chance de cielo colorido", "bonne chance de ciel coloré"],
    ["céu limpo, cores suaves", "clear sky, soft colors", "cielo despejado, colores suaves", "ciel dégagé, couleurs douces"], ["cores suaves", "soft colors", "colores suaves", "couleurs douces"],
    ["as nuvens devem esconder", "clouds will probably hide it", "las nubes deberían taparlo", "les nuages devraient le cacher"],
    ["Vista clássica daqui", "Classic view from here", "Vista clásica desde aquí", "Vue classique d'ici"],
    // ---- mapa e lugares
    ["Mapa:", "Map:", "Mapa:", "Carte :"], ["Mapa indisponível", "Map unavailable", "Mapa no disponible", "Carte indisponible"], ["Metrô", "Subway", "Metro", "Métro"],
    ["Posto", "Post", "Puesto", "Poste"], ["→ Posto #", "→ Post #", "→ Puesto #", "→ Poste #"], ["uns # min a pé", "about # min walk", "unos # min a pie", "environ # min à pied"],
    ["uns # min a pé até o Posto #", "about # min walk to Post #", "unos # min a pie hasta el Puesto #", "environ # min à pied jusqu'au Poste #"],
    ["· # min", "· # min", "· # min", "· # min"], ["colaboradores do OpenStreetMap", "OpenStreetMap contributors", "colaboradores de OpenStreetMap", "contributeurs d'OpenStreetMap"],
    ["entre o Arpoador e o Forte", "between Arpoador and the Fort", "entre Arpoador y el Fuerte", "entre Arpoador et le Fort"],
    ["Horários aprox", "Approx. times", "Horarios aprox", "Horaires approx"], ["Horários aprox.", "Approx. times", "Horarios aprox.", "Horaires approx."],
    ["Estilo padrão do mapa", "Default map style", "Estilo de mapa predeterminado", "Style de carte par défaut"],
    // ---- avisos e instalação
    ["Instale no iPhone", "Install on iPhone", "Instala en iPhone", "Installer sur iPhone"], ["Instale no iPhone: toque em", "Install on iPhone: tap", "Instala en iPhone: toca", "Installer sur iPhone : touchez"],
    ["Adicionar à Tela de Início", "Add to Home Screen", "Agregar a inicio", "Sur l'écran d'accueil"], ["e depois em", "and then", "y luego", "puis"], ["toque em", "tap", "toca", "touchez"],
    ["No iPhone", "On iPhone", "En iPhone", "Sur iPhone"], ["primeiro instale o app", "first install the app", "primero instala la app", "installez d'abord l'app"],
    ["Abra pelo ícone novo e ative aqui", "Open it from the new icon and turn it on here", "Ábrela desde el nuevo ícono y actívala aquí", "Ouvrez-la depuis la nouvelle icône et activez ici"],
    ["Abra pelo ícone novo e ligue aqui", "Open it from the new icon and turn it on here", "Ábrela desde el nuevo ícono y actívalo aquí", "Ouvrez-la depuis la nouvelle icône et activez ici"],
    ["🔔 Quer saber quando vai ter praião?", "🔔 Want to know when there'll be a great beach day?", "🔔 ¿Quieres saber cuándo habrá día de playa top?", "🔔 Envie de savoir quand il y aura une super journée de plage ?"],
    ["A gente avisa # dias antes e confirma (ou cancela) na véspera", "We let you know # days ahead and confirm (or cancel) the day before", "Avisamos # días antes y confirmamos (o cancelamos) la víspera", "On prévient # jours avant et on confirme (ou annule) la veille"],
    ["Me avisa", "Notify me", "Avísame", "Prévenez-moi"], ["Ativar alerta de praião", "Turn on beach-day alerts", "Activar alerta de playa top", "Activer l'alerte plage"],
    ["Alerta de praião ligado", "Beach-day alert on", "Alerta de playa top activada", "Alerte plage activée"], ["desligar", "turn off", "desactivar", "désactiver"],
    ["Pronto! Você vai receber o aviso quando vier praião", "Done! You'll be notified when a great beach day is coming", "¡Listo! Te avisaremos cuando venga un día de playa top", "C'est fait ! Vous serez prévenu avant une super journée de plage"],
    ["As notificações estão bloqueadas", "Notifications are blocked", "Las notificaciones están bloqueadas", "Les notifications sont bloquées"],
    ["Libere nas configurações do celular para o Praiômetro", "Allow them in your phone settings for Praiômetro", "Permítelas en los ajustes del celular para Praiômetro", "Autorisez-les dans les réglages du téléphone pour Praiômetro"],
    ["Esse navegador não aceita notificações", "This browser doesn't support notifications", "Este navegador no acepta notificaciones", "Ce navigateur n'accepte pas les notifications"],
    ["Tenta pelo Chrome ou instalando o app", "Try Chrome or install the app", "Prueba con Chrome o instalando la app", "Essayez Chrome ou installez l'app"],
    ["Carregando… tenta de novo em alguns segundos", "Loading… try again in a few seconds", "Cargando… intenta de nuevo en unos segundos", "Chargement… réessayez dans quelques secondes"],
    ["Não deu certo agora", "That didn't work right now", "No funcionó ahora", "Ça n'a pas marché"], ["Tenta de novo daqui a pouco", "Try again in a bit", "Intenta de nuevo en un rato", "Réessayez dans un moment"],
    ["Tente de novo daqui a pouco", "Try again in a bit", "Intenta de nuevo en un rato", "Réessayez dans un moment"],
    ["Os avisos não estão disponíveis agora", "Alerts aren't available right now", "Los avisos no están disponibles ahora", "Les alertes ne sont pas disponibles pour l'instant"],
    ["Sem internet", "No internet", "Sin internet", "Pas d'internet"], ["Mostrando a previsão salva", "Showing the saved forecast", "Mostrando el pronóstico guardado", "Affichage de la prévision enregistrée"],
    ["mostrando a previsão salva", "showing the saved forecast", "mostrando el pronóstico guardado", "affichage de la prévision enregistrée"],
    ["Atualiza sozinho quando a conexão voltar", "Updates automatically when you're back online", "Se actualiza solo cuando vuelva la conexión", "Se met à jour tout seul au retour de la connexion"],
    ["Não consegui atualizar agora", "Couldn't update right now", "No pude actualizar ahora", "Impossible de mettre à jour"],
    ["Não consegui carregar a previsão agora", "Couldn't load the forecast right now", "No pude cargar el pronóstico ahora", "Impossible de charger la prévision"],
    ["Verifique a internet e tente de novo", "Check your connection and try again", "Revisa la conexión e intenta de nuevo", "Vérifiez la connexion et réessayez"],
    ["Tentar de novo", "Try again", "Intentar de nuevo", "Réessayer"],
    // ---- treino cedo
    ["Meus treinos", "My workouts", "Mis entrenos", "Mes séances"], ["Toque num treino para ver hora a hora", "Tap a workout to see hour by hour", "Toca un entreno para ver hora a hora", "Touchez une séance pour voir heure par heure"],
    ["Quais esportes você pratica?", "Which sports do you play?", "¿Qué deportes practicas?", "Quels sports pratiquez-vous ?"],
    ["Escolha um para começar", "Pick one to start", "Elige uno para empezar", "Choisissez-en un pour commencer"],
    ["Depois você diz se é toda semana ou só um dia", "Then say if it's every week or just one day", "Luego dices si es cada semana o solo un día", "Ensuite, dites si c'est chaque semaine ou un seul jour"],
    ["Mais um esporte", "One more sport", "Un deporte más", "Un sport de plus"], ["Escolha o esporte que você quer adicionar", "Pick the sport you want to add", "Elige el deporte que quieres agregar", "Choisissez le sport à ajouter"],
    ["Qual esporte?", "Which sport?", "¿Qué deporte?", "Quel sport ?"], ["Escolha o esporte e o dia que você está pensando em ir", "Pick the sport and the day you're thinking of going", "Elige el deporte y el día que piensas ir", "Choisissez le sport et le jour où vous pensez y aller"],
    ["Toda semana", "Every week", "Cada semana", "Chaque semaine"], ["Só um dia", "Just one day", "Solo un día", "Un seul jour"],
    ["Que dia você está pensando em ir?", "Which day are you thinking of going?", "¿Qué día piensas ir?", "Quel jour pensez-vous y aller ?"],
    ["Em que dias?", "Which days?", "¿Qué días?", "Quels jours ?"], ["Que horas?", "What time?", "¿A qué hora?", "À quelle heure ?"], ["Em que praia?", "Which beach?", "¿En qué playa?", "Quelle plage ?"],
    ["Onde você corre?", "Where do you run?", "¿Dónde corres?", "Où courez-vous ?"], ["Salvar", "Save", "Guardar", "Enregistrer"], ["Ver a previsão", "See the forecast", "Ver el pronóstico", "Voir la prévision"],
    ["Escolha pelo menos um dia", "Pick at least one day", "Elige al menos un día", "Choisissez au moins un jour"], ["Remover esse treino", "Remove this workout", "Eliminar este entreno", "Supprimer cette séance"],
    ["+ Adicionar treino da semana", "+ Add weekly workout", "+ Agregar entreno semanal", "+ Ajouter une séance hebdo"],
    ["🔎 Pensando em ir num dia? Ver só esse dia", "🔎 Thinking of going one day? Check just that day", "🔎 ¿Piensas ir un día? Ver solo ese día", "🔎 Vous pensez y aller un jour ? Voir ce jour-là"],
    ["🔔 Quer um aviso na noite anterior?", "🔔 Want an alert the night before?", "🔔 ¿Quieres un aviso la noche anterior?", "🔔 Une alerte la veille au soir ?"],
    ["Às #h# da véspera de cada treino", "At #h# the night before each workout", "A las #h# la víspera de cada entreno", "À #h# la veille de chaque séance"],
    ["a gente diz como vai estar o vento e a chuva no seu horário", "we tell you the wind and rain at your time", "te decimos cómo estará el viento y la lluvia a tu hora", "on vous dit le vent et la pluie à votre heure"],
    ["🔔 Aviso na véspera", "🔔 Alert the night before", "🔔 Aviso la víspera", "🔔 Alerte la veille"], ["às #h#", "at #h#", "a las #h#", "à #h#"],
    ["Na noite anterior a cada treino", "The night before each workout", "La noche anterior a cada entreno", "La veille de chaque séance"],
    ["a gente avisa como vai estar no seu horário", "we let you know the conditions at your time", "te avisamos cómo estará a tu hora", "on vous dit les conditions à votre heure"],
    ["Ligado", "On", "Activado", "Activé"], ["Ligar aviso", "Turn on alert", "Activar aviso", "Activer l'alerte"], ["✓ Aviso ligado · desligar", "✓ Alert on · turn off", "✓ Aviso activado · desactivar", "✓ Alerte activée · désactiver"],
    ["Agora não", "Not now", "Ahora no", "Pas maintenant"], ["Ligando…", "Turning on…", "Activando…", "Activation…"],
    ["Pronto! Na véspera dos seus treinos", "Done! The night before your workouts", "¡Listo! La víspera de tus entrenos", "C'est fait ! La veille de vos séances"], ["chega o aviso", "you'll get the alert", "llega el aviso", "vous recevez l'alerte"],
    ["Seus dias", "Your days", "Tus días", "Vos jours"], ["Todo dia", "Every day", "Todos los días", "Tous les jours"],
    ["Editar dias, horário e praia", "Edit days, time and beach", "Editar días, hora y playa", "Modifier jours, heure et plage"], ["Editar dias", "Edit days", "Editar días", "Modifier les jours"],
    ["horário e praia", "time and beach", "hora y playa", "heure et plage"], ["Mudar dia, horário ou praia", "Change day, time or beach", "Cambiar día, hora o playa", "Changer jour, heure ou plage"],
    ["Mudar dia", "Change day", "Cambiar día", "Changer de jour"], ["horário ou praia", "time or beach", "hora o playa", "heure ou plage"],
    ["salvar como treino da semana", "save as a weekly workout", "guardar como entreno semanal", "enregistrer comme séance hebdo"],
    ["Ótimo pra jogar", "Great for playing", "Ideal para jugar", "Idéal pour jouer"], ["Ótimo pra correr", "Great for running", "Ideal para correr", "Idéal pour courir"],
    ["Dá, mas atrapalha", "Doable, but it gets in the way", "Se puede, pero molesta", "Faisable, mais ça gêne"], ["Ruim pra jogar", "Bad for playing", "Malo para jugar", "Mauvais pour jouer"],
    ["Ruim pra correr", "Bad for running", "Malo para correr", "Mauvais pour courir"], ["ótimo", "great", "ideal", "idéal"], ["atrapalha", "gets in the way", "molesta", "gêne"],
    ["ruim", "bad", "malo", "mauvais"], ["bom", "good", "bueno", "bon"], ["Bom", "Good", "Bueno", "Bon"], ["Atrapalhou", "It got in the way", "Molestó", "Ça a gêné"], ["Ruim", "Bad", "Malo", "Mauvais"],
    ["Vento fraco e sem chuva", "Light wind and no rain", "Viento suave y sin lluvia", "Vent faible et pas de pluie"],
    ["Temperatura boa e sem chuva", "Nice temperature and no rain", "Buena temperatura y sin lluvia", "Bonne température et pas de pluie"],
    ["Por causa de vento forte", "Because of strong wind", "Por viento fuerte", "À cause du vent fort"], ["Por causa de chuva", "Because of rain", "Por lluvia", "À cause de la pluie"],
    ["Por causa de vento", "Because of the wind", "Por el viento", "À cause du vent"], ["Por causa de chance de chuva", "Because of a chance of rain", "Por probabilidad de lluvia", "À cause du risque de pluie"],
    ["Por causa de chuva e vento forte", "Because of rain and strong wind", "Por lluvia y viento fuerte", "À cause de la pluie et du vent fort"],
    ["Por causa de chance de chuva e vento", "Because of a chance of rain and wind", "Por probabilidad de lluvia y viento", "À cause du risque de pluie et du vent"],
    ["Por causa de abafado", "Because it's muggy", "Por bochorno", "À cause de la chaleur moite"], ["Por causa de calor perigoso", "Because of dangerous heat", "Por calor peligroso", "À cause d'une chaleur dangereuse"],
    ["O vento aperta a partir das #h", "Wind picks up from #h", "El viento aprieta desde las #h", "Le vent forcit à partir de #h"], ["Piora a partir das #h", "Gets worse from #h", "Empeora desde las #h", "Se dégrade à partir de #h"],
    ["Hora a hora · vento pra bola", "Hour by hour · wind for the ball", "Hora a hora · viento para la pelota", "Heure par heure · vent pour la balle"],
    ["vento pra bola", "wind for the ball", "viento para la pelota", "vent pour la balle"], ["calor e chuva", "heat and rain", "calor y lluvia", "chaleur et pluie"],
    ["bom até # km/h", "good up to # km/h", "bueno hasta # km/h", "bon jusqu'à # km/h"], ["atrapalha até #", "gets in the way up to #", "molesta hasta #", "gêne jusqu'à #"],
    ["acima disso", "above that", "por encima de eso", "au-delà"], ["acima disso, ruim", "above that, bad", "por encima, malo", "au-delà, mauvais"],
    ["UV alto", "High UV", "UV alto", "UV élevé"], ["a partir das #h", "from #h", "desde las #h", "à partir de #h"], ["a partir das", "from", "desde las", "à partir de"],
    ["não fica alto", "doesn't get high", "no sube mucho", "ne monte pas"], ["Calor + umidade", "Heat + humidity", "Calor + humedad", "Chaleur + humidité"],
    ["tranquilo", "fine", "tranquilo", "tranquille"], ["abafado, vá com calma", "muggy, take it easy", "bochornoso, ve con calma", "lourd, allez-y doucement"], ["perigoso, evite", "dangerous, avoid it", "peligroso, evítalo", "dangereux, à éviter"],
    ["Maré às #h", "Tide at #h", "Marea a las #h", "Marée à #h"], ["baixa · faixa larga", "low · wide strip", "baja · franja ancha", "basse · large bande"],
    ["alta · faixa estreita", "high · narrow strip", "alta · franja estrecha", "haute · bande étroite"], ["média", "medium", "media", "moyenne"],
    ["Como estava o vento pro seu jogo hoje às #h?", "How was the wind for your game today at #h?", "¿Cómo estuvo el viento para tu juego hoy a las #h?", "Comment était le vent pour votre jeu aujourd'hui à #h ?"],
    ["Como estava a corrida hoje às #h?", "How was your run today at #h?", "¿Cómo estuvo la carrera hoy a las #h?", "Comment était votre course aujourd'hui à #h ?"],
    ["Valeu! Isso ajuda a deixar o Treino cedo mais preciso. 🙌", "Thanks! This helps make Early workout more accurate. 🙌", "¡Gracias! Esto ayuda a que Entreno temprano sea más preciso. 🙌", "Merci ! Ça aide à rendre Sport du matin plus précis. 🙌"],
    ["* Os limites de vento são estimativas e estão sujeitos a mudanças", "* Wind limits are estimates and may change", "* Los límites de viento son estimaciones y pueden cambiar", "* Les limites de vent sont des estimations et peuvent changer"],
    ["Contamos também com o seu feedback para melhorar cada vez mais a nossa precisão", "We also count on your feedback to keep improving our accuracy", "También contamos con tu opinión para mejorar cada vez más nuestra precisión", "Nous comptons aussi sur vos retours pour améliorer notre précision"],
    ["Sem previsão para esse horário.", "No forecast for this time.", "Sin pronóstico para esta hora.", "Pas de prévision pour cette heure."],
    ["Sem previsão nos próximos dias", "No forecast in the coming days", "Sin pronóstico en los próximos días", "Pas de prévision dans les prochains jours"],
    ["Beach tennis", "Beach tennis", "Beach tenis", "Beach tennis"], ["Vôlei", "Volleyball", "Vóley", "Volley"], ["Futevôlei", "Footvolley", "Futvóley", "Footvolley"],
    ["Altinha", "Altinha", "Altinha", "Altinha"], ["Frescobol", "Frescobol", "Frescobol", "Frescobol"], ["Corrida", "Running", "Correr", "Course"],
    ["a corrida", "your run", "la carrera", "la course"],
    ["Dia", "Day", "Día", "Jour"], ["Hora", "Time", "Hora", "Heure"], ["Praia", "Beach", "Playa", "Plage"], ["vento e maré", "wind and tide", "viento y marea", "vent et marée"],
    ["ondas de até # m", "waves up to # m", "olas de hasta # m", "vagues jusqu'à # m"],
    ["por causa dos prédios", "because of the buildings", "por los edificios", "à cause des immeubles"],
    ["por causa do morro", "because of the hill", "por el cerro", "à cause de la colline"],
    ["sombra dos prédios", "building shade", "sombra de los edificios", "ombre des immeubles"],
    ["Depois disso, sombra dos prédios", "After that, building shade", "Después, sombra de los edificios", "Ensuite, ombre des immeubles"],
    ["uns # min a pé até a Av. Princesa Isabel", "about # min walk to Av. Princesa Isabel", "unos # min a pie hasta la Av. Princesa Isabel", "environ # min à pied jusqu'à l'Av. Princesa Isabel"],
    ["uns # min a pé até a Av", "about # min walk to Av", "unos # min a pie hasta la Av", "environ # min à pied jusqu'à l'Av"],
    ["Pico do UV às #h", "UV peak at #h", "Pico de UV a las #h", "Pic d'UV à #h"], ["Pico às #h", "Peak at #h", "Pico a las #h", "Pic à #h"],
    ["às", "to", "a", "à"], ["Baía de Guanabara", "Guanabara Bay", "Bahía de Guanabara", "Baie de Guanabara"],
    ["Região Oceânica", "Ocean Region", "Región Oceánica", "Région océanique"], ["ao pé do Dois Irmãos", "at the foot of Dois Irmãos", "al pie del Dois Irmãos", "au pied du Dois Irmãos"],
    ["ao pé da Pedra da Gávea", "at the foot of Pedra da Gávea", "al pie de la Pedra da Gávea", "au pied de la Pedra da Gávea"],
    ["Joá", "Joá", "Joá", "Joá"], ["acesso por escadaria", "access by stairs", "acceso por escalera", "accès par un escalier"],
    ["Postos # a #", "Posts # to #", "Puestos # a #", "Postes # à #"], ["Parque Natural", "Nature park", "Parque natural", "Parc naturel"],
    ["Área de proteção", "Protected area", "Área protegida", "Zone protégée"], ["abafado", "muggy", "bochorno", "chaleur moite"], ["calor perigoso", "dangerous heat", "calor peligroso", "chaleur dangereuse"],
    ["Olhando para o norte", "Facing north", "Mirando al norte", "Face au nord"],
    ["Olhando para o nordeste", "Facing northeast", "Mirando al noreste", "Face au nord-est"],
    ["Olhando para o leste", "Facing east", "Mirando al este", "Face au est"],
    ["Olhando para o sudeste", "Facing southeast", "Mirando al sureste", "Face au sud-est"],
    ["Olhando para o sul", "Facing south", "Mirando al sur", "Face au sud"],
    ["Olhando para o sudoeste", "Facing southwest", "Mirando al suroeste", "Face au sud-ouest"],
    ["Olhando para o oeste", "Facing west", "Mirando al oeste", "Face au ouest"],
    ["Olhando para o noroeste", "Facing northwest", "Mirando al noroeste", "Face au nord-ouest"],
    ["Olhando para o alto", "Looking up", "Mirando hacia arriba", "Vers le haut"], ["Sol no céu", "Sun in the sky", "Sol en el cielo", "Soleil dans le ciel"],
    ["Sol agora", "Sun now", "Sol ahora", "Soleil maintenant"], ["Nasce #h#", "Rises #h#", "Sale #h#", "Se lève #h#"], ["🌅 Pôr do sol #h#", "🌅 Sunset #h#", "🌅 Atardecer #h#", "🌅 Coucher #h#"],
    ["☀️ O sol está pra lá", "☀️ The sun is that way", "☀️ El sol está por allá", "☀️ Le soleil est par là"],
    ["Toque no sol de verdade para acertar o desenho", "Tap the real sun to line up the drawing", "Toca el sol real para ajustar el dibujo", "Touchez le vrai soleil pour caler le dessin"],
    ["Desenho acertado pelo sol de verdade ✓", "Drawing lined up with the real sun ✓", "Dibujo ajustado al sol real ✓", "Dessin calé sur le vrai soleil ✓"],
    ["Siga a seta para achar o sol", "Follow the arrow to find the sun", "Sigue la flecha para encontrar el sol", "Suivez la flèche pour trouver le soleil"],
    ["O sol já se pôs", "The sun has already set", "El sol ya se puso", "Le soleil est déjà couché"], ["A linha mostra o caminho de hoje", "The line shows today's path", "La línea muestra el camino de hoy", "La ligne montre la course du jour"],
    ["Pronto, acertei o desenho ☀️", "Done, drawing lined up ☀️", "Listo, ajusté el dibujo ☀️", "C'est fait, dessin calé ☀️"],
    ["Mexa o celular devagar para ligar a bússola…", "Move the phone slowly to start the compass…", "Mueve el celular despacio para activar la brújula…", "Bougez le téléphone doucement pour activer la boussole…"],
    ["Calibrando a bússola…", "Calibrating the compass…", "Calibrando la brújula…", "Calibrage de la boussole…"], ["Abrindo a câmera…", "Opening the camera…", "Abriendo la cámara…", "Ouverture de la caméra…"],
    ["Aponte para o horizonte", "Point at the horizon", "Apunta al horizonte", "Visez l'horizon"],
    ["Segure o celular em pé, mirando o mar, por 1 segundo", "Hold the phone upright, aiming at the sea, for 1 second", "Sostén el celular de pie, apuntando al mar, por 1 segundo", "Tenez le téléphone droit, face à la mer, 1 seconde"],
    ["Depois é só subir para o céu", "Then just tilt up to the sky", "Después solo súbelo al cielo", "Puis levez-le vers le ciel"],
    ["temperatura", "temperature", "temperatura", "température"], ["chuva", "rain", "lluvia", "pluie"]
  ];
  const DIR = { L: "E", O: "W" };                          // leste/oeste nas siglas de direção (inglês); espanhol e francês usam O
  const SEP = /( · |\. |, |: | — )/;
  const DIAS_RE = /\b(segunda|terça|quarta|quinta|sexta|sábado|domingo)\b/g;
  const IDX = { en: 1, es: 2, fr: 3 };
  const mapa = {};                                         // chave normalizada -> [en, es, fr]
  FRASES.forEach((f) => { mapa[f[0]] = f.slice(1); });
  const DIA_NOME = {}; ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"].forEach((d) => { DIA_NOME[d] = mapa[d]; });

  let lingua = "pt";
  try { lingua = localStorage.getItem("pm-lingua") || ""; } catch (e) {}
  if (!lingua) { const n = (navigator.language || "pt").slice(0, 2); lingua = IDX[n] ? n : "pt"; }

  const NUM = /\d+(?:[.,]\d+)?/g;
  function porChave(txt) {
    const nums = txt.match(NUM) || [], dias = txt.match(DIAS_RE) || [];
    const chave = txt.replace(NUM, "#").replace(DIAS_RE, "{D}");
    const t = mapa[chave]; if (!t) return null;
    let i = 0, j = 0;
    return t[IDX[lingua] - 1].replace(/#/g, () => nums[i++] ?? "#").replace(/\{D\}/g, () => { const d = dias[j++]; return d ? DIA_NOME[d][IDX[lingua] - 1] : ""; });
  }
  function direcao(p) {      // "De SO", "SSO 12 km/h ·", "OSO"
    const m = p.match(/^(De )?([NSLO]{1,3})( \d.*)?$/); if (!m || !/^(N|NNE|NE|ENE|L|ESE|SE|SSE|S|SSO|SO|OSO|O|ONO|NO|NNO)$/.test(m[2])) return null;
    const sig = lingua === "en" ? m[2].replace(/[LO]/g, (c) => DIR[c]) : m[2].replace(/L/g, "E");
    const de = m[1] ? { en: "From ", es: "Del ", fr: "Du " }[lingua] : "";
    return de + sig + (m[3] ? (traduzPeca(m[3].trim()) ? " " + traduzPeca(m[3].trim()) : m[3]) : "");
  }
  function traduzPeca(p) {
    if (!p) return p;
    const fim = /[.!?]$/.test(p) && !mapa[p.replace(NUM, "#").replace(DIAS_RE, "{D}")] ? p.slice(-1) : "";
    const base = fim ? p.slice(0, -1) : p;
    const r = porChave(base); if (r != null) return r + fim;
    const d = direcao(base); if (d != null) return d + fim;
    // "Por causa de X e Y" e "X e Y": traduz cada lado
    const pc = base.match(/^Por causa de (.+)$/);
    if (pc) { const r2 = traduzE(pc[1]); if (r2 != null) return { en: "Because of ", es: "Por ", fr: "À cause de " }[lingua] + r2 + fim; }
    if (/ e /.test(base)) { const r3 = traduzE(base); if (r3 != null) return r3 + fim; }
    // "Seg 6h", "Amanhã 7h": traduz a palavra e mantém o horário
    const ph = / · /.test(base) ? null : base.match(/^(\S+) (\d+h.*)$/);   // com " · " no meio, cada pedaço é traduzido separado
    if (ph) { const w = porChave(ph[1]); if (w != null) {
      // "Qua 7h: ótimo": traduz também o que vem depois dos dois-pontos
      const rh = ph[2].match(/^(\d+h): (.+)$/), dep = rh ? porChave(rh[2]) : null;
      return w + " " + (dep != null ? rh[1] + ": " + dep : ph[2]) + fim; } }
    return null;
  }
  function traduzE(t) {
    const lados = t.split(" e "), tr = lados.map((x) => porChave(x.trim()));
    if (tr.some((x) => x == null)) return null;
    return tr.join({ en: " and ", es: " y ", fr: " et " }[lingua]);
  }
  function traduz(txt) {
    if (lingua === "pt") return txt;
    const ini = txt.match(/^\s*/)[0], fim = txt.match(/\s*$/)[0], miolo = txt.trim();
    if (!miolo || !/[A-Za-zÀ-ú]/.test(miolo)) return txt;
    let r = traduzPeca(miolo);
    if (r == null) {
      const partes = miolo.split(SEP); let mudou = false;
      r = partes.map((p) => { if (SEP.test(p)) return p; const t = traduzPeca(p.trim()); if (t != null) { mudou = true; return p.replace(p.trim(), t); } return p; }).join("");
      if (!mudou) return txt;
    }
    return ini + r + fim;
  }

  // guarda o texto original de cada nó para poder voltar ao português ou trocar de língua
  const original = new WeakMap(), origAttr = new WeakMap();
  const ATRS = ["placeholder", "aria-label", "title"];
  let aplicando = false;
  function noTexto(n) {
    const atual = n.nodeValue, salvo = original.get(n);
    // se o app trocou o texto depois, o "original" passa a ser o novo
    const orig = salvo && (atual === salvo.trad || atual === salvo.pt) ? salvo.pt : atual;
    const t = traduz(orig);
    original.set(n, { pt: orig, trad: t });
    if (t !== atual) n.nodeValue = t;
  }
  function noAtrib(el) {
    let s = origAttr.get(el); if (!s) { s = {}; origAttr.set(el, s); }
    ATRS.forEach((a) => {
      const v = el.getAttribute(a); if (v == null) return;
      const orig = s[a] && (v === s[a].trad || v === s[a].pt) ? s[a].pt : v;
      const t = traduz(orig); s[a] = { pt: orig, trad: t };
      if (t !== v) el.setAttribute(a, t);
    });
  }
  const pular = (el) => el && el.closest && el.closest("script, style, .maplibregl-map, .lingua-menu, [data-sem-traducao]");
  function varre(raiz) {
    if (!raiz) return;
    if (raiz.nodeType === 3) { if (!pular(raiz.parentElement)) noTexto(raiz); return; }
    if (raiz.nodeType !== 1 || pular(raiz)) return;
    if (raiz.hasAttribute && ATRS.some((a) => raiz.hasAttribute(a))) noAtrib(raiz);
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n; while ((n = w.nextNode())) {
      if (n.nodeType === 1) { if (pular(n)) continue; if (ATRS.some((a) => n.hasAttribute(a))) noAtrib(n); }
      else if (!pular(n.parentElement)) noTexto(n);
    }
  }
  function aplicar() {
    aplicando = true;
    document.documentElement.lang = lingua === "pt" ? "pt-BR" : lingua;
    varre(document.body);
    aplicando = false;
    const b = document.getElementById("linguaBtn"); if (b) b.querySelector("b").textContent = LINGUAS.find((l) => l[0] === lingua)[2];
  }
  const obs = new MutationObserver((ms) => {
    if (aplicando || lingua === "pt") return;
    aplicando = true;
    ms.forEach((m) => {
      if (m.type === "characterData") { if (!pular(m.target.parentElement)) noTexto(m.target); }
      else if (m.type === "attributes") { if (!pular(m.target)) noAtrib(m.target); }
      else m.addedNodes.forEach(varre);
    });
    aplicando = false;
  });

  // botão no canto direito, na linha do logo
  function montarBotao() {
    const brand = document.querySelector(".brand"); if (!brand) return;
    const caixa = document.createElement("div");
    caixa.className = "lingua"; caixa.setAttribute("data-sem-traducao", "");
    caixa.innerHTML = `<button id="linguaBtn" class="lingua-btn" aria-haspopup="true" aria-expanded="false" aria-label="Idioma / Language">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.8 3.8 5.8 3.8 9s-1.2 6.2-3.8 9c-2.6-2.8-3.8-5.8-3.8-9S9.4 5.8 12 3z"/></svg><b>PT</b></button>
      <div class="lingua-menu" id="linguaMenu" hidden>${LINGUAS.map((l) => `<button data-l="${l[0]}">${l[1]}</button>`).join("")}</div>`;
    brand.appendChild(caixa);
    const btn = caixa.querySelector("#linguaBtn"), menu = caixa.querySelector("#linguaMenu");
    const abre = (v) => { menu.hidden = !v; btn.setAttribute("aria-expanded", v); menu.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.l === lingua)); };
    btn.onclick = (e) => { e.stopPropagation(); abre(menu.hidden); };
    document.addEventListener("click", (e) => { if (!caixa.contains(e.target)) abre(false); });
    menu.querySelectorAll("button").forEach((b) => b.onclick = () => {
      lingua = b.dataset.l; try { localStorage.setItem("pm-lingua", lingua); } catch (e) {}
      abre(false); aplicar();
      (window.pmEventos = window.pmEventos || []).push("lingua-" + lingua);
    });
  }
  function iniciar() {
    montarBotao(); aplicar();
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATRS });
  }
  window.pmLingua = { atual: () => lingua, traduz };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();

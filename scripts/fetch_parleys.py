import json
import math
import os
import urllib.request
from datetime import datetime, timedelta, timezone

LEAGUES = [
    {"code": "eng.1", "name": "Premier League", "avg_goals": 2.95, "avg_corners": 10.3, "avg_cards": 3.9},
    {"code": "esp.1", "name": "LaLiga", "avg_goals": 2.62, "avg_corners": 9.4, "avg_cards": 4.8},
    {"code": "ita.1", "name": "Serie A", "avg_goals": 2.65, "avg_corners": 9.6, "avg_cards": 4.5},
    {"code": "ger.1", "name": "Bundesliga", "avg_goals": 3.15, "avg_corners": 9.8, "avg_cards": 3.8},
    {"code": "fra.1", "name": "Ligue 1", "avg_goals": 2.72, "avg_corners": 9.3, "avg_cards": 3.9},
    {"code": "bra.1", "name": "Brasileirão", "avg_goals": 2.42, "avg_corners": 10.1, "avg_cards": 5.2},
    {"code": "arg.1", "name": "Liga Argentina", "avg_goals": 2.15, "avg_corners": 9.2, "avg_cards": 5.4},
    {"code": "usa.1", "name": "MLS", "avg_goals": 3.05, "avg_corners": 9.9, "avg_cards": 4.1},
]


def safe_dict(obj, key):
    if not isinstance(obj, dict):
        return {}
    val = obj.get(key)
    return val if isinstance(val, dict) else {}


def american_to_prob(ml):
    if ml is None:
        return None
    try:
        val = float(ml)
        if val < 0:
            return (-val) / (-val + 100.0)
        if val > 0:
            return 100.0 / (val + 100.0)
    except (ValueError, TypeError):
        pass
    return None


def parse_record_ppg(summary):
    if not isinstance(summary, str):
        return 1.35
    try:
        parts = [int(p) for p in summary.split("-") if p.isdigit()]
        if len(parts) >= 3:
            w, d, l = parts[0], parts[1], parts[2]
            gp = w + d + l
            if gp > 0:
                return (w * 3.0 + d * 1.0) / gp
    except Exception:
        pass
    return 1.35


def poisson_pmf(k, lam):
    return (math.exp(-lam) * (lam ** k)) / math.factorial(k)


def prob_over(line, lam):
    threshold = int(math.floor(line))
    under_prob = sum(poisson_pmf(k, lam) for k in range(threshold + 1))
    return min(max(1.0 - under_prob, 0.08), 0.92)


def make_option(key, label, prob):
    p = min(max(prob, 0.12), 0.91)
    odd = round(max(1.10, (1.0 / p) * 0.94), 2)
    return {
        "key": key,
        "label": label,
        "probability": round(p * 100, 1),
        "odd": odd,
    }


def build_match_markets(comp, home_team, away_team, home_name, away_name, league_cfg):
    home_records = home_team.get("records")
    away_records = away_team.get("records")

    home_summary = (
        home_records[0].get("summary", "")
        if isinstance(home_records, list) and home_records and isinstance(home_records[0], dict)
        else ""
    )
    away_summary = (
        away_records[0].get("summary", "")
        if isinstance(away_records, list) and away_records and isinstance(away_records[0], dict)
        else ""
    )

    home_ppg = parse_record_ppg(home_summary)
    away_ppg = parse_record_ppg(away_summary)

    # 1. Probabilidades 1X2 (Momios de mercado si existen, sino modelo estadístico)
    source = "Modelo Estadístico"
    odds_list = comp.get("odds")
    p_h = p_d = p_a = None

    if isinstance(odds_list, list) and odds_list and isinstance(odds_list[0], dict):
        primary_odds = odds_list[0]
        raw_h = american_to_prob(safe_dict(primary_odds, "homeTeamOdds").get("moneyLine"))
        raw_a = american_to_prob(safe_dict(primary_odds, "awayTeamOdds").get("moneyLine"))
        raw_d = american_to_prob(safe_dict(primary_odds, "drawOdds").get("moneyLine")) or 0.26
        if raw_h and raw_a:
            tot = raw_h + raw_d + raw_a
            p_h, p_d, p_a = raw_h / tot, raw_d / tot, raw_a / tot
            source = "Momios de Mercado"

    if p_h is None:
        diff = (home_ppg + 0.32) - away_ppg
        raw_h = 1.0 / (1.0 + math.exp(-1.15 * diff))
        raw_a = 1.0 / (1.0 + math.exp(1.15 * diff))
        raw_d = max(0.18, 0.30 - abs(diff) * 0.06)
        tot = raw_h + raw_d + raw_a
        p_h, p_d, p_a = raw_h / tot, raw_d / tot, raw_a / tot

    result_options = [
        make_option("1", f"Gana {home_name}", p_h),
        make_option("X", "Empate", p_d),
        make_option("2", f"Gana {away_name}", p_a),
        make_option("1X", f"{home_name} o Empate (1X)", p_h + p_d),
        make_option("X2", f"{away_name} o Empate (X2)", p_a + p_d),
    ]

    # 2. Goles Totales y por Equipo (Poisson ajustado por fuerza ofensiva)
    base_goals = league_cfg["avg_goals"]
    home_factor = max(0.65, min(1.55, (home_ppg + 0.25) / 1.45))
    away_factor = max(0.60, min(1.50, away_ppg / 1.45))

    lam_home = (base_goals * 0.55) * home_factor
    lam_away = (base_goals * 0.45) * away_factor
    lam_total = lam_home + lam_away

    goals_options = [
        make_option("O15", "Total: Más de 1.5 Goles", prob_over(1.5, lam_total)),
        make_option("O25", "Total: Más de 2.5 Goles", prob_over(2.5, lam_total)),
        make_option("U25", "Total: Menos de 2.5 Goles", 1.0 - prob_over(2.5, lam_total)),
        make_option("H05", f"{home_name}: Más de 0.5 Goles", prob_over(0.5, lam_home)),
        make_option("H15", f"{home_name}: Más de 1.5 Goles", prob_over(1.5, lam_home)),
        make_option("A05", f"{away_name}: Más de 0.5 Goles", prob_over(0.5, lam_away)),
        make_option("A15", f"{away_name}: Más de 1.5 Goles", prob_over(1.5, lam_away)),
    ]

    # 3. Tiros de Esquina (Córners)
    lam_corners = league_cfg["avg_corners"] * (0.92 + 0.08 * (home_factor + away_factor) / 2.0)
    corners_options = [
        make_option("C85", "Córners: Más de 8.5", prob_over(8.5, lam_corners)),
        make_option("C95", "Córners: Más de 9.5", prob_over(9.5, lam_corners)),
        make_option("CU105", "Córners: Menos de 10.5", 1.0 - prob_over(10.5, lam_corners)),
    ]

    # 4. Tarjetas Amarillas
    competitiveness = max(0.88, 1.12 - abs(home_ppg - away_ppg) * 0.12)
    lam_cards = league_cfg["avg_cards"] * competitiveness
    cards_options = [
        make_option("Y35", "Tarjetas: Más de 3.5", prob_over(3.5, lam_cards)),
        make_option("Y45", "Tarjetas: Más de 4.5", prob_over(4.5, lam_cards)),
        make_option("YU45", "Tarjetas: Menos de 4.5", 1.0 - prob_over(4.5, lam_cards)),
    ]

    # Selección principal recomendada del partido (entre 1X2 / Doble Oportunidad)
    best_result = max(
        [result_options[0], result_options[2], result_options[3], result_options[4]],
        key=lambda x: x["probability"] if x["probability"] <= 82 else x["probability"] * 0.92,
    )

    return {
        "pick": best_result["label"],
        "probability": best_result["probability"],
        "odd": best_result["odd"],
        "source": source,
        "markets": {
            "result": result_options,
            "goals": goals_options,
            "corners": corners_options,
            "cards": cards_options,
        },
    }


def query_espn(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_all_matches():
    now_utc = datetime.now(timezone.utc)
    end_utc = now_utc + timedelta(days=10)
    date_range = f"{now_utc.strftime('%Y%m%d')}-{end_utc.strftime('%Y%m%d')}"

    all_matches = []
    seen_ids = set()

    for league in LEAGUES:
        base_url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/{league['code']}/scoreboard"
        events = []

        try:
            data = query_espn(f"{base_url}?dates={date_range}")
            events = data.get("events") or []
        except Exception as e:
            print(f"Error consultando rango en {league['name']}: {e}")

        if not events:
            try:
                data = query_espn(base_url)
                events = data.get("events") or []
            except Exception as e:
                print(f"Error consultando jornada base en {league['name']}: {e}")

        for event in events:
            if not isinstance(event, dict):
                continue
            try:
                event_id = event.get("id")
                if not event_id or event_id in seen_ids:
                    continue

                state = safe_dict(safe_dict(event, "status"), "type").get("state", "")
                if state != "pre":
                    continue

                competitions = event.get("competitions")
                if not isinstance(competitions, list) or not competitions:
                    continue

                comp = competitions[0]
                competitors = comp.get("competitors")
                if not isinstance(competitors, list) or len(competitors) < 2:
                    continue

                home_c = next((c for c in competitors if isinstance(c, dict) and c.get("homeAway") == "home"), competitors[0])
                away_c = next((c for c in competitors if isinstance(c, dict) and c.get("homeAway") == "away"), competitors[1])

                home_info = safe_dict(home_c, "team")
                away_info = safe_dict(away_c, "team")

                home_name = home_info.get("shortDisplayName") or home_info.get("displayName") or "Local"
                away_name = away_info.get("shortDisplayName") or away_info.get("displayName") or "Visita"

                market_bundle = build_match_markets(comp, home_c, away_c, home_name, away_name, league)
                seen_ids.add(event_id)

                all_matches.append({
                    "id": str(event_id),
                    "league": league["name"],
                    "league_code": league["code"],
                    "date": event.get("date"),
                    "home": home_name,
                    "away": away_name,
                    **market_bundle,
                })
            except Exception as err:
                print(f"Partido omitido en {league['name']}: {err}")
                continue

    all_matches.sort(key=lambda x: x["probability"], reverse=True)
    return all_matches


def build_parley(title, tag, description, legs):
    if not legs:
        return None
    combined_prob = 1.0
    combined_odd = 1.0
    for leg in legs:
        combined_prob *= leg["probability"] / 100.0
        combined_odd *= leg["odd"]

    return {
        "title": title,
        "tag": tag,
        "description": description,
        "combined_probability": round(combined_prob * 100, 1),
        "combined_odd": round(combined_odd, 2),
        "legs": legs,
    }


def main():
    matches = fetch_all_matches()

    # Parley 1: Conservador (Top 3 más probables)
    safe_legs = [
        {
            "id": m["id"],
            "league": m["league"],
            "home": m["home"],
            "away": m["away"],
            "pick": m["pick"],
            "probability": m["probability"],
            "odd": m["odd"],
        }
        for m in matches[:3]
    ]

    # Parley 2: Multiliga (4 ligas diferentes)
    diverse_legs = []
    seen_leagues = set()
    for m in matches:
        if m["league"] not in seen_leagues:
            diverse_legs.append({
                "id": m["id"],
                "league": m["league"],
                "home": m["home"],
                "away": m["away"],
                "pick": m["pick"],
                "probability": m["probability"],
                "odd": m["odd"],
            })
            seen_leagues.add(m["league"])
        if len(diverse_legs) == 4:
            break

    # Parley 3: Mix Mercados (Goles, Córners, Tarjetas y Resultado)
    mix_legs = []
    market_cycle = [("goals", 0), ("corners", 0), ("cards", 0), ("result", 0)]
    for idx, m in enumerate(matches[:4]):
        m_cat, opt_idx = market_cycle[idx % len(market_cycle)]
        chosen_opt = m["markets"][m_cat][opt_idx]
        mix_legs.append({
            "id": m["id"],
            "league": m["league"],
            "home": m["home"],
            "away": m["away"],
            "pick": chosen_opt["label"],
            "probability": chosen_opt["probability"],
            "odd": chosen_opt["odd"],
        })

    parleys = [
        p
        for p in [
            build_parley(
                "Parley Conservador",
                "Alta Probabilidad",
                "Los 3 pronósticos más sólidos de resultado/doble oportunidad.",
                safe_legs,
            ),
            build_parley(
                "Parley Multiliga",
                "Balanceado",
                "4 selecciones de distintas ligas para diversificar riesgo.",
                diverse_legs,
            ),
            build_parley(
                "Parley Especial (Goles/Córners/Tarjetas)",
                "Mercados Mixtos",
                "Combinación automática de goles, tiros de esquina y tarjetas.",
                mix_legs,
            ),
        ]
        if p is not None
    ]

    output = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "total_matches": len(matches),
        "parleys": parleys,
        "matches": matches,
    }

    os.makedirs("data", exist_ok=True)
    with open("data/parleys.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"Generados {len(parleys)} parleys y {len(matches)} partidos.")


if __name__ == "__main__":
    main()
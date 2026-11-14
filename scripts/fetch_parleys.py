import json
import math
import os
import urllib.request
from datetime import datetime, timedelta, timezone

LEAGUES = [
    {"code": "eng.1", "name": "Premier League", "region": "Europa"},
    {"code": "esp.1", "name": "LaLiga", "region": "Europa"},
    {"code": "ita.1", "name": "Serie A", "region": "Europa"},
    {"code": "ger.1", "name": "Bundesliga", "region": "Europa"},
    {"code": "fra.1", "name": "Ligue 1", "region": "Europa"},
    {"code": "bra.1", "name": "Brasileirão", "region": "Sudamérica"},
    {"code": "arg.1", "name": "Liga Argentina", "region": "Sudamérica"},
    {"code": "usa.1", "name": "MLS", "region": "Norteamérica"},
]


def american_to_prob(ml):
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


def calculate_probabilities(comp, home_team, away_team):
    odds_list = comp.get("odds", [])
    if odds_list and isinstance(odds_list, list):
        primary_odds = odds_list[0]
        h_ml = primary_odds.get("homeTeamOdds", {}).get("moneyLine")
        a_ml = primary_odds.get("awayTeamOdds", {}).get("moneyLine")
        d_ml = primary_odds.get("drawOdds", {}).get("moneyLine")

        p_h = american_to_prob(h_ml)
        p_a = american_to_prob(a_ml)
        p_d = american_to_prob(d_ml) or 0.26

        if p_h and p_a:
            total = p_h + p_d + p_a
            return p_h / total, p_d / total, p_a / total, "Momios de Mercado"

    home_summary = (home_team.get("records") or [{}])[0].get("summary", "")
    away_summary = (away_team.get("records") or [{}])[0].get("summary", "")

    home_ppg = parse_record_ppg(home_summary) + 0.32
    away_ppg = parse_record_ppg(away_summary)

    diff = home_ppg - away_ppg
    p_h = 1.0 / (1.0 + math.exp(-1.15 * diff))
    p_a = 1.0 / (1.0 + math.exp(1.15 * diff))
    p_d = max(0.18, 0.30 - abs(diff) * 0.06)

    total = p_h + p_d + p_a
    return p_h / total, p_d / total, p_a / total, "Modelo Estadístico"


def select_best_pick(p_h, p_d, p_a, home_name, away_name):
    if p_h >= 0.60:
        return f"Gana {home_name}", p_h
    if p_a >= 0.58:
        return f"Gana {away_name}", p_a
    if (p_h + p_d) >= 0.76 and p_h >= p_a:
        return f"{home_name} o Empate (1X)", p_h + p_d
    if (p_a + p_d) >= 0.74 and p_a > p_h:
        return f"{away_name} o Empate (X2)", p_a + p_d
    if p_h >= p_a:
        return f"Gana {home_name}", p_h
    return f"Gana {away_name}", p_a


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
            events = data.get("events", [])
        except Exception as e:
            print(f"Error consultando rango en {league['name']}: {e}")

        # Respaldo: si el rango de fechas viene vacío, pedir la próxima jornada por defecto
        if not events:
            try:
                data = query_espn(base_url)
                events = data.get("events", [])
            except Exception as e:
                print(f"Error consultando jornada base en {league['name']}: {e}")

        league_count = 0
        for event in events:
            event_id = event.get("id")
            if not event_id or event_id in seen_ids:
                continue

            state = event.get("status", {}).get("type", {}).get("state", "")
            if state != "pre":
                continue

            comp = (event.get("competitions") or [{}])[0]
            competitors = comp.get("competitors", [])
            if len(competitors) < 2:
                continue

            seen_ids.add(event_id)
            league_count += 1

            home_c = next((c for c in competitors if c.get("homeAway") == "home"), competitors[0])
            away_c = next((c for c in competitors if c.get("homeAway") == "away"), competitors[1])

            home_name = home_c.get("team", {}).get("shortDisplayName") or home_c.get("team", {}).get("displayName", "Local")
            away_name = away_c.get("team", {}).get("shortDisplayName") or away_c.get("team", {}).get("displayName", "Visita")

            p_h, p_d, p_a, source = calculate_probabilities(comp, home_c, away_c)
            pick_label, best_prob = select_best_pick(p_h, p_d, p_a, home_name, away_name)

            best_prob = min(max(best_prob, 0.35), 0.91)
            est_odd = round(max(1.12, (1.0 / best_prob) * 0.94), 2)

            all_matches.append({
                "id": event_id,
                "league": league["name"],
                "league_code": league["code"],
                "date": event.get("date"),
                "home": home_name,
                "away": away_name,
                "pick": pick_label,
                "probability": round(best_prob * 100, 1),
                "odd": est_odd,
                "source": source,
                "probs_detail": {
                    "home": round(p_h * 100, 1),
                    "draw": round(p_d * 100, 1),
                    "away": round(p_a * 100, 1),
                },
            })

        print(f"{league['name']}: {league_count} partidos próximos encontrados.")

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

    safe_legs = matches[:3]

    diverse_legs = []
    seen_leagues = set()
    for m in matches:
        if m["league"] not in seen_leagues:
            diverse_legs.append(m)
            seen_leagues.add(m["league"])
        if len(diverse_legs) == 4:
            break
    if len(diverse_legs) < 4:
        diverse_legs = matches[:4]

    value_candidates = [m for m in matches if m["odd"] >= 1.45][:4]
    if len(value_candidates) < 3:
        value_candidates = matches[2:6]

    parleys = [
        p
        for p in [
            build_parley(
                "Parley Conservador",
                "Alta Probabilidad",
                "Combinación de los 3 pronósticos más sólidos de la próxima jornada.",
                safe_legs,
            ),
            build_parley(
                "Parley Multiliga",
                "Balanceado",
                "4 selecciones de distintas ligas para reducir correlación de jornada.",
                diverse_legs,
            ),
            build_parley(
                "Parley Cuota Alta",
                "Mayor Retorno",
                "Selecciones directas con mayor multiplicador esperado.",
                value_candidates,
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

    print(f"Total generado: {len(parleys)} parleys y {len(matches)} partidos.")


if __name__ == "__main__":
    main()
import json
import os
import re
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

LEAGUES = [
    {"slug": "eng.1", "name": "Premier League", "odds_key": "soccer_epl"},
    {"slug": "esp.1", "name": "LaLiga", "odds_key": "soccer_spain_la_liga"},
    {"slug": "ita.1", "name": "Serie A", "odds_key": "soccer_italy_serie_a"},
    {"slug": "ger.1", "name": "Bundesliga", "odds_key": "soccer_germany_bundesliga"},
    {"slug": "fra.1", "name": "Ligue 1", "odds_key": "soccer_france_ligue_one"},
    {"slug": "uefa.champions", "name": "Champions League", "odds_key": "soccer_uefa_champs_league"},
    {"slug": "uefa.europa", "name": "Europa League", "odds_key": "soccer_uefa_europa_league"},
    {"slug": "uefa.europa.conf", "name": "Conference League", "odds_key": None},
    {"slug": "concacaf.league", "name": "CONCACAF", "odds_key": None},
    {"slug": "fifa.friendly", "name": "Selecciones / FIFA", "odds_key": None},
    {"slug": "uefa.nations", "name": "Selecciones / FIFA", "odds_key": "soccer_uefa_nations_league"},
    {"slug": "concacaf.nations.league", "name": "Selecciones / FIFA", "odds_key": None},
    {"slug": "fifa.worldq.conmebol", "name": "Eliminatorias", "odds_key": "soccer_fifa_world_cup_qualifiers_south_america"},
    {"slug": "fifa.worldq.uefa", "name": "Eliminatorias", "odds_key": "soccer_fifa_world_cup_qualifiers_europe"},
    {"slug": "fifa.worldq.concacaf", "name": "Eliminatorias", "odds_key": None},
    {"slug": "mex.1", "name": "Liga MX", "odds_key": "soccer_mexico_ligamx"},
    {"slug": "conmebol.libertadores", "name": "Copa Libertadores", "odds_key": "soccer_conmebol_copa_libertadores"},
    {"slug": "conmebol.sudamericana", "name": "Copa Sudamericana", "odds_key": None},
    {"slug": "ned.1", "name": "Eredivisie", "odds_key": "soccer_netherlands_eredivisie"},
    {"slug": "por.1", "name": "Primeira Liga", "odds_key": "soccer_portugal_primeira_liga"},
    {"slug": "bra.1", "name": "Brasileirão", "odds_key": "soccer_brazil_campeonato"},
    {"slug": "arg.1", "name": "Liga Argentina", "odds_key": "soccer_argentina_primera_division"},
    {"slug": "usa.1", "name": "MLS", "odds_key": "soccer_usa_mls"},
]


def normalize_team_name(name):
    cleaned = re.sub(r"[^a-z0-9 ]", "", str(name or "").lower())
    for stop in ("fc", "cf", "ac", "sc", "cd", "club", "de", "la", "el"):
        cleaned = re.sub(rf"\b{stop}\b", "", cleaned)
    return " ".join(cleaned.split())


def ml_to_prob(ml):
    ml = float(ml)
    if ml < 0:
        return abs(ml) / (abs(ml) + 100.0)
    return 100.0 / (ml + 100.0)


def prob_to_odd(prob_pct):
    safe_prob = max(int(prob_pct), 8)
    raw_odd = (100.0 / safe_prob) * 0.94
    return round(max(1.12, raw_odd), 2)


def parse_win_rate(record_summary):
    if not record_summary or not isinstance(record_summary, str):
        return None
    parts = record_summary.split("-")
    try:
        nums = [int(x) for x in parts]
    except ValueError:
        return None
    if len(nums) < 2:
        return None
    wins = nums[0]
    draws = nums[1] if len(nums) >= 3 else 0
    losses = nums[2] if len(nums) >= 3 else nums[1]
    total = wins + draws + losses
    if total <= 0:
        return None
    return (wins + draws * 0.4) / total


def fetch_bookmaker_odds(odds_key, api_key):
    if not odds_key or not api_key:
        return {}
    url = (
        f"https://api.the-odds-api.com/v4/sports/{odds_key}/odds/"
        f"?apiKey={urllib.parse.quote(api_key)}&regions=eu&markets=h2h&oddsFormat=decimal"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (ZenDeckBot/2.0)"})
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            events = json.loads(resp.read().decode("utf-8"))
    except Exception:
        return {}

    lookup = {}
    for ev in events if isinstance(events, list) else []:
        h_norm = normalize_team_name(ev.get("home_team", ""))
        a_norm = normalize_team_name(ev.get("away_team", ""))
        bookmakers = ev.get("bookmakers", [])
        if not bookmakers:
            continue
        markets = bookmakers[0].get("markets", [])
        h2h = next((m for m in markets if m.get("key") == "h2h"), None)
        if not h2h:
            continue
        outcomes = {normalize_team_name(o.get("name", "")): float(o.get("price", 0)) for o in h2h.get("outcomes", [])}
        draw_price = next((float(o.get("price", 0)) for o in h2h.get("outcomes", []) if o.get("name", "").lower() == "draw"), 0)
        h_price = outcomes.get(h_norm, 0)
        a_price = outcomes.get(a_norm, 0)
        if h_price > 1.0 and a_price > 1.0:
            lookup[(h_norm, a_norm)] = {
                "home": round(h_price, 2),
                "draw": round(draw_price, 2) if draw_price > 1.0 else None,
                "away": round(a_price, 2),
            }
    return lookup


def fetch_league_matches(slug, league_name, date_range, bookmaker_lookup):
    url = (
        f"https://site.api.espn.com/apis/site/v2/sports/soccer/"
        f"{slug}/scoreboard?dates={date_range}"
    )
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (ZenDeckBot/2.0)"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception:
        return []

    matches = []
    for ev in data.get("events", []):
        status_state = ev.get("status", {}).get("type", {}).get("state", "")
        if status_state == "post":
            continue

        comps = ev.get("competitions", [])
        if not comps:
            continue
        comp = comps[0]
        competitors = comp.get("competitors", [])
        if len(competitors) < 2:
            continue

        home = next((c for c in competitors if c.get("homeAway") == "home"), competitors[0])
        away = next((c for c in competitors if c.get("homeAway") == "away"), competitors[1])

        home_name = (
            home.get("team", {}).get("shortDisplayName")
            or home.get("team", {}).get("displayName")
            or "Local"
        )
        away_name = (
            away.get("team", {}).get("shortDisplayName")
            or away.get("team", {}).get("displayName")
            or "Visita"
        )
        home_full = home.get("team", {}).get("displayName", home_name)
        away_full = away.get("team", {}).get("displayName", away_name)

        home_rec = (home.get("records") or [{}])[0].get("summary", "")
        away_rec = (away.get("records") or [{}])[0].get("summary", "")

        odds_list = comp.get("odds", [])
        odds_obj = odds_list[0] if odds_list else {}

        home_ml = odds_obj.get("homeTeamOdds", {}).get("moneyLine")
        away_ml = odds_obj.get("awayTeamOdds", {}).get("moneyLine")
        draw_ml = odds_obj.get("drawOdds", {}).get("moneyLine")

        if home_ml is not None and away_ml is not None:
            raw_h = ml_to_prob(home_ml)
            raw_a = ml_to_prob(away_ml)
            raw_d = ml_to_prob(draw_ml) if draw_ml is not None else 0.27
            total = (raw_h + raw_a + raw_d) or 1.0
            p_home = round((raw_h / total) * 100)
            p_away = round((raw_a / total) * 100)
            p_draw = max(12, 100 - p_home - p_away)
        else:
            home_wr = parse_win_rate(home_rec)
            away_wr = parse_win_rate(away_rec)
            if home_wr is not None and away_wr is not None:
                diff = home_wr - away_wr
                p_home = min(72, max(18, round(44 + diff * 34)))
                p_away = min(68, max(15, round(31 - diff * 32)))
                p_draw = max(16, 100 - p_home - p_away)
            else:
                seed = (len(home_name) * 7 + len(away_name) * 5) % 24
                p_home = 36 + seed
                p_draw = 26
                p_away = max(15, 100 - p_home - p_draw)

        bm = bookmaker_lookup.get(
            (normalize_team_name(home_full), normalize_team_name(away_full))
        ) or bookmaker_lookup.get(
            (normalize_team_name(home_name), normalize_team_name(away_name))
        )

        odd_home = bm["home"] if bm and bm.get("home") else prob_to_odd(p_home)
        odd_draw = bm["draw"] if bm and bm.get("draw") else prob_to_odd(p_draw)
        odd_away = bm["away"] if bm and bm.get("away") else prob_to_odd(p_away)

        p_over25 = min(72, max(38, round(44 + abs(p_home - p_away) * 0.45)))
        p_btts_yes = min(70, max(36, round(62 - abs(p_home - p_away) * 0.35)))

        matches.append(
            {
                "id": str(ev.get("id", "")),
                "league": league_name,
                "date": ev.get("date", ""),
                "home": home_name,
                "away": away_name,
                "homeRecord": home_rec,
                "awayRecord": away_rec,
                "odds": {
                    "home": odd_home,
                    "draw": odd_draw,
                    "away": odd_away,
                },
                "probabilities": {
                    "home": p_home,
                    "draw": p_draw,
                    "away": p_away,
                    "over25": p_over25,
                    "bttsYes": p_btts_yes,
                },
            }
        )

    return matches


def build_recommended_parleys(matches):
    if len(matches) < 2:
        return []

    safe_legs = []
    goals_legs = []
    winner_legs = []

    for m in matches:
        p_h = m["probabilities"]["home"]
        p_d = m["probabilities"]["draw"]
        p_a = m["probabilities"]["away"]
        p_o25 = m["probabilities"].get("over25", 50)

        # Doble oportunidad
        if (p_h + p_d) >= (p_a + p_d):
            dc_prob = min(92, p_h + p_d)
            safe_legs.append({
                "matchId": m["id"],
                "matchLabel": f"{m['home']} vs {m['away']}",
                "pick": "1X",
                "pickLabel": f"Doble Op: {m['home']} o Empate",
                "odd": prob_to_odd(dc_prob),
                "prob": dc_prob,
            })
        else:
            dc_prob = min(92, p_a + p_d)
            safe_legs.append({
                "matchId": m["id"],
                "matchLabel": f"{m['home']} vs {m['away']}",
                "pick": "X2",
                "pickLabel": f"Doble Op: Empate o {m['away']}",
                "odd": prob_to_odd(dc_prob),
                "prob": dc_prob,
            })

        # Goles +2.5
        goals_legs.append({
            "matchId": m["id"],
            "matchLabel": f"{m['home']} vs {m['away']}",
            "pick": "O25",
            "pickLabel": "Más de 2.5 Goles",
            "odd": prob_to_odd(p_o25),
            "prob": p_o25,
        })

        # Ganador 1X2
        pick_home = p_h >= p_a
        winner_legs.append({
            "matchId": m["id"],
            "matchLabel": f"{m['home']} vs {m['away']}",
            "pick": "1" if pick_home else "2",
            "pickLabel": f"Gana {m['home']}" if pick_home else f"Gana {m['away']}",
            "odd": m["odds"]["home"] if pick_home else m["odds"]["away"],
            "prob": p_h if pick_home else p_a,
        })

    def make_pack(title, tag, legs):
        if not legs:
            return None
        total_odd = 1.0
        combined_prob = 1.0
        for leg in legs:
            total_odd *= leg["odd"]
            combined_prob *= leg["prob"] / 100.0
        return {
            "title": title,
            "tag": tag,
            "odd": round(total_odd, 2),
            "prob": round(combined_prob * 100),
            "legs": legs,
        }

    packs = [
        make_pack("Doble Oportunidad Segura", "Conservador", sorted(safe_legs, key=lambda x: x["prob"], reverse=True)[:3]),
        make_pack("Festival de Goles (+2.5)", "Goles", sorted(goals_legs, key=lambda x: x["prob"], reverse=True)[:3]),
        make_pack("Combinada Directa 1X2", "Alta Cuota", sorted(winner_legs, key=lambda x: x["prob"], reverse=True)[:4]),
    ]
    return [p for p in packs if p is not None]


def main():
    now_utc = datetime.now(timezone.utc)
    end_utc = now_utc + timedelta(days=14)
    date_range = f"{now_utc.strftime('%Y%m%d')}-{end_utc.strftime('%Y%m%d')}"
    odds_api_key = os.environ.get("ODDS_API_KEY", "").strip()

    all_matches = []
    seen_ids = set()
    odds_cache = {}

    for lg in LEAGUES:
        o_key = lg.get("odds_key")
        if o_key and odds_api_key and o_key not in odds_cache:
            odds_cache[o_key] = fetch_bookmaker_odds(o_key, odds_api_key)
        bm_lookup = odds_cache.get(o_key, {})

        for m in fetch_league_matches(lg["slug"], lg["name"], date_range, bm_lookup):
            if m["id"] and m["id"] not in seen_ids:
                seen_ids.add(m["id"])
                all_matches.append(m)

    all_matches.sort(key=lambda x: x.get("date", ""))

    # Hora local Honduras (UTC-6)
    hn_time = now_utc - timedelta(hours=6)
    packs = build_recommended_parleys(all_matches)
    payload = {
        "updated_at": hn_time.strftime("%d/%m/%Y, %I:%M %p"),
        "total_matches": len(all_matches),
        "matches": all_matches,
        "recommended_parleys": packs,
        "auto_parleys": packs,
    }

    os.makedirs("data", exist_ok=True)
    output_path = os.path.join("data", "parleys.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"Generados {len(all_matches)} partidos en {output_path}")


if __name__ == "__main__":
    main()

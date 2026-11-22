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

OUTPUT_PATH = os.path.join("data", "parleys.json")
HISTORY_PATH = os.path.join("data", "parleys_history.json")


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


def load_json_safe(path, default):
    if not os.path.exists(path):
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def fetch_bookmaker_odds(odds_key, api_key):
    if not odds_key or not api_key:
        return {}
    url = (
        f"https://api.the-odds-api.com/v4/sports/{odds_key}/odds/"
        f"?apiKey={urllib.parse.quote(api_key)}&regions=eu&markets=h2h&oddsFormat=decimal"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (ZenDeckBot/2.1)"})
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
        outcomes = {
            normalize_team_name(o.get("name", "")): float(o.get("price", 0))
            for o in h2h.get("outcomes", [])
        }
        draw_price = next(
            (float(o.get("price", 0)) for o in h2h.get("outcomes", []) if o.get("name", "").lower() == "draw"),
            0,
        )
        h_price = outcomes.get(h_norm, 0)
        a_price = outcomes.get(a_norm, 0)
        if h_price > 1.0 and a_price > 1.0:
            lookup[(h_norm, a_norm)] = {
                "home": round(h_price, 2),
                "draw": round(draw_price, 2) if draw_price > 1.0 else None,
                "away": round(a_price, 2),
            }
    return lookup


def fetch_league_scoreboard(slug, league_name, date_range, bookmaker_lookup):
    """Retorna (upcoming_matches, completed_results, ok_flag)."""
    url = (
        f"https://site.api.espn.com/apis/site/v2/sports/soccer/"
        f"{slug}/scoreboard?dates={date_range}"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (ZenDeckBot/2.1)"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception:
        return [], {}, False

    matches = []
    completed = {}

    for ev in data.get("events", []):
        ev_id = str(ev.get("id", ""))
        status_state = ev.get("status", {}).get("type", {}).get("state", "")
        comps = ev.get("competitions", [])
        if not comps:
            continue
        comp = comps[0]
        competitors = comp.get("competitors", [])
        if len(competitors) < 2:
            continue

        home = next((c for c in competitors if c.get("homeAway") == "home"), competitors[0])
        away = next((c for c in competitors if c.get("homeAway") == "away"), competitors[1])

        if status_state == "post":
            try:
                h_score = int(home.get("score", 0))
                a_score = int(away.get("score", 0))
                outcome = "1" if h_score > a_score else ("2" if a_score > h_score else "X")
                if ev_id:
                    completed[ev_id] = outcome
            except (ValueError, TypeError):
                pass
            continue

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
                "id": ev_id,
                "league": league_name,
                "date": ev.get("date", ""),
                "home": home_name,
                "away": away_name,
                "homeRecord": home_rec,
                "awayRecord": away_rec,
                "odds": {"home": odd_home, "draw": odd_draw, "away": odd_away},
                "probabilities": {
                    "home": p_home,
                    "draw": p_draw,
                    "away": p_away,
                    "over25": p_over25,
                    "bttsYes": p_btts_yes,
                },
            }
        )

    return matches, completed, True


def update_accuracy_history(history_data, current_matches, completed_map):
    predictions = history_data.setdefault("predictions", {})
    stats = history_data.setdefault("league_stats", {})

    # Evaluar predicciones pendientes cuyos partidos ya finalizaron
    for ev_id, actual_outcome in completed_map.items():
        pred = predictions.get(ev_id)
        if pred and not pred.get("settled"):
            league = pred.get("league", "General")
            lg_stat = stats.setdefault(league, {"hits": 0, "misses": 0, "total": 0, "accuracy": 0})
            if pred.get("predicted") == actual_outcome:
                lg_stat["hits"] += 1
                pred["won"] = True
            else:
                lg_stat["misses"] += 1
                pred["won"] = False
            lg_stat["total"] = lg_stat["hits"] + lg_stat["misses"]
            lg_stat["accuracy"] = round((lg_stat["hits"] / lg_stat["total"]) * 100, 1) if lg_stat["total"] else 0
            pred["settled"] = True

    # Registrar nuevas predicciones favoritas (1, X o 2)
    for m in current_matches:
        ev_id = m.get("id")
        if not ev_id or ev_id in predictions:
            continue
        probs = m.get("probabilities", {})
        best_pick = max(
            [("1", probs.get("home", 0)), ("X", probs.get("draw", 0)), ("2", probs.get("away", 0))],
            key=lambda x: x[1],
        )[0]
        predictions[ev_id] = {
            "league": m.get("league", "General"),
            "label": f"{m.get('home')} vs {m.get('away')}",
            "predicted": best_pick,
            "settled": False,
            "won": None,
        }

    # Limitar historial a los últimos 400 registros para mantener archivo ligero
    if len(predictions) > 400:
        keys_to_keep = list(predictions.keys())[-400:]
        history_data["predictions"] = {k: predictions[k] for k in keys_to_keep}

    return history_data


def build_recommended_parleys(matches):
    if len(matches) < 2:
        return []

    safe_legs, goals_legs, winner_legs = [], [], []

    for m in matches:
        p_h = m["probabilities"]["home"]
        p_d = m["probabilities"]["draw"]
        p_a = m["probabilities"]["away"]
        p_o25 = m["probabilities"].get("over25", 50)

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

        goals_legs.append({
            "matchId": m["id"],
            "matchLabel": f"{m['home']} vs {m['away']}",
            "pick": "O25",
            "pickLabel": "Más de 2.5 Goles",
            "odd": prob_to_odd(p_o25),
            "prob": p_o25,
        })

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
    os.makedirs("data", exist_ok=True)
    prev_payload = load_json_safe(OUTPUT_PATH, {})
    history_data = load_json_safe(HISTORY_PATH, {"predictions": {}, "league_stats": {}})

    now_utc = datetime.now(timezone.utc)
    # Rango incluye 2 días atrás para liquidar resultados recientes en el historial
    start_utc = now_utc - timedelta(days=2)
    end_utc = now_utc + timedelta(days=14)
    date_range = f"{start_utc.strftime('%Y%m%d')}-{end_utc.strftime('%Y%m%d')}"
    odds_api_key = os.environ.get("ODDS_API_KEY", "").strip()

    all_matches = []
    all_completed = {}
    seen_ids = set()
    odds_cache = {}
    failed_leagues = []

    for lg in LEAGUES:
        o_key = lg.get("odds_key")
        if o_key and odds_api_key and o_key not in odds_cache:
            odds_cache[o_key] = fetch_bookmaker_odds(o_key, odds_api_key)
        bm_lookup = odds_cache.get(o_key, {})

        lg_matches, lg_completed, ok = fetch_league_scoreboard(
            lg["slug"], lg["name"], date_range, bm_lookup
        )
        all_completed.update(lg_completed)

        if not ok:
            failed_leagues.append(lg["name"])
            # Conservar partidos vigentes de esa liga desde el respaldo anterior
            prev_lg = [
                m for m in prev_payload.get("matches", [])
                if m.get("league") == lg["name"] and m.get("id") not in seen_ids
            ]
            for pm in prev_lg:
                seen_ids.add(pm["id"])
                all_matches.append(pm)
            continue

        for m in lg_matches:
            if m["id"] and m["id"] not in seen_ids:
                seen_ids.add(m["id"])
                all_matches.append(m)

    history_data = update_accuracy_history(history_data, all_matches, all_completed)
    with open(HISTORY_PATH, "w", encoding="utf-8") as f:
        json.dump(history_data, f, ensure_ascii=False, indent=2)

    hn_time = now_utc - timedelta(hours=6)

    # Si todas las fuentes fallaron y hay respaldo previo, preservar respaldo marcado como stale
    if not all_matches and prev_payload.get("matches"):
        payload = {
            **prev_payload,
            "stale": True,
            "stale_since": prev_payload.get("updated_at", hn_time.strftime("%d/%m/%Y, %I:%M %p")),
            "failed_leagues": failed_leagues,
            "league_stats": history_data.get("league_stats", {}),
        }
    else:
        all_matches.sort(key=lambda x: x.get("date", ""))
        packs = build_recommended_parleys(all_matches)
        is_partial_stale = len(failed_leagues) > 0
        payload = {
            "updated_at": hn_time.strftime("%d/%m/%Y, %I:%M %p"),
            "stale": is_partial_stale,
            "stale_leagues": failed_leagues,
            "total_matches": len(all_matches),
            "matches": all_matches,
            "recommended_parleys": packs,
            "auto_parleys": packs,
            "league_stats": history_data.get("league_stats", {}),
        }

    # Validación final de esquema antes de guardar
    assert isinstance(payload["matches"], list)
    assert isinstance(payload["auto_parleys"], list)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"Guardados {len(payload['matches'])} partidos (stale={payload['stale']})")


if __name__ == "__main__":
    main()
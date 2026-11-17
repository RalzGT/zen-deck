import json
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

# Zona horaria de Honduras (UTC-6) para sincronizar filtros de fecha en el frontend
LOCAL_TZ = timezone(timedelta(hours=-6))

# Configuración de ligas alineada con los botones de filtro en index.html
LEAGUES_CONFIG = [
    {
        "name": "Premier League",
        "odds_keys": ["soccer_epl"],
        "espn_slugs": ["eng.1"],
    },
    {
        "name": "LaLiga",
        "odds_keys": ["soccer_spain_la_liga"],
        "espn_slugs": ["esp.1"],
    },
    {
        "name": "Serie A",
        "odds_keys": ["soccer_italy_serie_a"],
        "espn_slugs": ["ita.1"],
    },
    {
        "name": "Bundesliga",
        "odds_keys": ["soccer_germany_bundesliga"],
        "espn_slugs": ["ger.1"],
    },
    {
        "name": "Ligue 1",
        "odds_keys": ["soccer_france_ligue_one"],
        "espn_slugs": ["fra.1"],
    },
    {
        "name": "Champions League",
        "odds_keys": ["soccer_uefa_champs_league"],
        "espn_slugs": ["uefa.champions"],
    },
    {
        "name": "Fecha FIFA",
        "odds_keys": [
            "soccer_fifa_world_cup_qualifiers_south_america",
            "soccer_fifa_world_cup_qualifiers_europe",
            "soccer_uefa_nations_league",
            "soccer_international_friendlies",
        ],
        "espn_slugs": [
            "fifa.worldq.conmebol",
            "fifa.worldq.uefa",
            "uefa.nations",
            "fifa.friendly",
        ],
    },
    {
        "name": "Brasileirão",
        "odds_keys": ["soccer_brazil_campeonato"],
        "espn_slugs": ["bra.1"],
    },
    {
        "name": "Liga Argentina",
        "odds_keys": ["soccer_argentina_primera_division"],
        "espn_slugs": ["arg.1"],
    },
    {
        "name": "MLS",
        "odds_keys": ["soccer_usa_mls"],
        "espn_slugs": ["usa.1"],
    },
]


def http_get_json(url: str, timeout: int = 15):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "ZenDeck-ParleysBot/2.0",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def parse_iso_to_local(iso_str: str) -> str:
    try:
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        local_dt = dt.astimezone(LOCAL_TZ)
        return local_dt.strftime("%Y-%m-%d %H:%M")
    except Exception:
        return iso_str[:16].replace("T", " ")


def normalize_three_way(odd_home: float, odd_draw: float, odd_away: float):
    odd_home = max(1.05, float(odd_home))
    odd_draw = max(1.05, float(odd_draw))
    odd_away = max(1.05, float(odd_away))

    inv_h = 1.0 / odd_home
    inv_d = 1.0 / odd_draw
    inv_a = 1.0 / odd_away
    total_inv = inv_h + inv_d + inv_a

    prob_h = round((inv_h / total_inv) * 100, 1)
    prob_d = round((inv_d / total_inv) * 100, 1)
    prob_a = round(max(1.0, 100.0 - prob_h - prob_d), 1)
    return prob_h, prob_d, prob_a


def build_match_entry(
    match_id: str,
    league: str,
    home: str,
    away: str,
    date_str: str,
    odd_h: float,
    odd_d: float,
    odd_a: float,
):
    prob_h, prob_d, prob_a = normalize_three_way(odd_h, odd_d, odd_a)
    return {
        "id": match_id,
        "league": league,
        "home": home,
        "away": away,
        "date": date_str,
        "odds": {
            "home": round(odd_h, 2),
            "draw": round(odd_d, 2),
            "away": round(odd_a, 2),
        },
        "probs": {
            "home": prob_h,
            "draw": prob_d,
            "away": prob_a,
        },
        "options": [
            {"pick": home, "odd": round(odd_h, 2), "prob": prob_h},
            {"pick": "Empate", "odd": round(odd_d, 2), "prob": prob_d},
            {"pick": away, "odd": round(odd_a, 2), "prob": prob_a},
        ],
    }


def fetch_from_odds_api(api_key: str) -> list:
    matches = []
    seen_ids = set()
    now_utc = datetime.now(timezone.utc)
    horizon_utc = now_utc + timedelta(days=10)

    for league_cfg in LEAGUES_CONFIG:
        league_name = league_cfg["name"]
        for sport_key in league_cfg["odds_keys"]:
            url = (
                f"https://api.the-odds-api.com/v4/sports/{sport_key}/odds/"
                f"?apiKey={urllib.parse.quote(api_key)}&regions=eu,us&markets=h2h&oddsFormat=decimal"
            )
            try:
                events = http_get_json(url)
            except Exception as exc:
                print(f"[OddsAPI] Omitiendo {sport_key}: {exc}")
                continue

            if not isinstance(events, list):
                continue

            for ev in events:
                ev_id = str(ev.get("id", ""))
                if not ev_id or ev_id in seen_ids:
                    continue

                commence = ev.get("commence_time", "")
                try:
                    dt_ev = datetime.fromisoformat(commence.replace("Z", "+00:00"))
                    if dt_ev < now_utc - timedelta(hours=1) or dt_ev > horizon_utc:
                        continue
                except Exception:
                    pass

                home = ev.get("home_team", "").strip()
                away = ev.get("away_team", "").strip()
                if not home or not away:
                    continue

                # Promediar cuotas entre casas disponibles
                h_list, d_list, a_list = [], [], []
                for bm in ev.get("bookmakers", []):
                    for mkt in bm.get("markets", []):
                        if mkt.get("key") != "h2h":
                            continue
                        outcomes = {o.get("name"): o.get("price") for o in mkt.get("outcomes", [])}
                        if home in outcomes and away in outcomes:
                            h_list.append(float(outcomes[home]))
                            a_list.append(float(outcomes[away]))
                            if "Draw" in outcomes:
                                d_list.append(float(outcomes["Draw"]))

                if not h_list or not a_list:
                    continue

                odd_h = sum(h_list) / len(h_list)
                odd_a = sum(a_list) / len(a_list)
                odd_d = (sum(d_list) / len(d_list)) if d_list else 3.35

                seen_ids.add(ev_id)
                matches.append(
                    build_match_entry(
                        match_id=ev_id,
                        league=league_name,
                        home=home,
                        away=away,
                        date_str=parse_iso_to_local(commence),
                        odd_h=odd_h,
                        odd_d=odd_d,
                        odd_a=odd_a,
                    )
                )

    return matches


def american_to_decimal(am_odd) -> float:
    try:
        val = float(am_odd)
        if val > 0:
            return round(1.0 + (val / 100.0), 2)
        if val < 0:
            return round(1.0 + (100.0 / abs(val)), 2)
    except Exception:
        pass
    return 0.0


def estimate_odds_from_records(home_comp: dict, away_comp: dict):
    def win_rate(comp: dict) -> float:
        recs = comp.get("records") or []
        if recs and isinstance(recs[0], dict):
            summary = recs[0].get("summary", "")
            parts = summary.split("-")
            if len(parts) >= 2 and parts[0].isdigit() and parts[1].isdigit():
                w = int(parts[0])
                l = int(parts[1])
                d = int(parts[2]) if len(parts) >= 3 and parts[2].isdigit() else 0
                total = max(1, w + l + d)
                return (w + 0.5 * d) / total
        return 0.45

    hr = win_rate(home_comp) + 0.08  # Ventaja de localía
    ar = win_rate(away_comp)
    raw_h = max(0.18, min(0.76, 0.40 + (hr - ar) * 0.55))
    raw_d = 0.27
    raw_a = max(0.12, 1.0 - raw_h - raw_d)
    tot = raw_h + raw_d + raw_a
    ph, pd, pa = raw_h / tot, raw_d / tot, raw_a / tot

    # Aplicar margen estándar del 5% para convertir probabilidad en cuota decimal
    margin = 1.05
    return (
        round(max(1.15, 1.0 / (ph * margin)), 2),
        round(max(2.60, 1.0 / (pd * margin)), 2),
        round(max(1.15, 1.0 / (pa * margin)), 2),
    )


def fetch_from_espn_public() -> list:
    matches = []
    seen_ids = set()
    now_local = datetime.now(LOCAL_TZ)
    start_str = now_local.strftime("%Y%m%d")
    end_str = (now_local + timedelta(days=7)).strftime("%Y%m%d")

    for league_cfg in LEAGUES_CONFIG:
        league_name = league_cfg["name"]
        for slug in league_cfg["espn_slugs"]:
            url = (
                f"https://site.api.espn.com/apis/site/v2/sports/soccer/{slug}/scoreboard"
                f"?dates={start_str}-{end_str}"
            )
            try:
                data = http_get_json(url)
            except Exception as exc:
                print(f"[ESPN] Omitiendo {slug}: {exc}")
                continue

            for ev in data.get("events", []):
                ev_id = f"espn_{ev.get('id', '')}"
                if not ev_id or ev_id in seen_ids:
                    continue

                status_state = ev.get("status", {}).get("type", {}).get("state", "")
                if status_state == "post":
                    continue

                comps = ev.get("competitions", [])
                if not comps:
                    continue
                comp = comps[0]
                competitors = comp.get("competitors", [])
                home_c = next((c for c in competitors if c.get("homeAway") == "home"), None)
                away_c = next((c for c in competitors if c.get("homeAway") == "away"), None)
                if not home_c or not away_c:
                    continue

                home_name = home_c.get("team", {}).get("shortDisplayName") or home_c.get("team", {}).get("displayName", "")
                away_name = away_c.get("team", {}).get("shortDisplayName") or away_c.get("team", {}).get("displayName", "")
                if not home_name or not away_name:
                    continue

                odd_h = odd_d = odd_a = 0.0
                odds_arr = comp.get("odds") or []
                if odds_arr and isinstance(odds_arr[0], dict):
                    o0 = odds_arr[0]
                    odd_h = american_to_decimal(o0.get("homeTeamOdds", {}).get("moneyLine"))
                    odd_a = american_to_decimal(o0.get("awayTeamOdds", {}).get("moneyLine"))
                    odd_d = american_to_decimal(o0.get("drawOdds", {}).get("moneyLine"))

                if odd_h <= 1.0 or odd_a <= 1.0:
                    odd_h, odd_d, odd_a = estimate_odds_from_records(home_c, away_c)
                elif odd_d <= 1.0:
                    odd_d = 3.30

                seen_ids.add(ev_id)
                matches.append(
                    build_match_entry(
                        match_id=ev_id,
                        league=league_name,
                        home=home_name,
                        away=away_name,
                        date_str=parse_iso_to_local(ev.get("date", "")),
                        odd_h=odd_h,
                        odd_d=odd_d,
                        odd_a=odd_a,
                    )
                )

    return matches


def generate_auto_parleys(matches: list) -> list:
    if not matches:
        return []

    best_picks = []
    for m in matches:
        opts = m.get("options") or []
        if not opts:
            continue
        top_opt = max(opts, key=lambda o: float(o.get("prob", 0)))
        best_picks.append(
            {
                "match_id": m["id"],
                "match": f"{m['home']} vs {m['away']}",
                "pick": top_opt["pick"],
                "odd": float(top_opt["odd"]),
                "prob": float(top_opt["prob"]),
            }
        )

    best_picks.sort(key=lambda x: x["prob"], reverse=True)

    def make_parley(name: str, legs: list):
        if len(legs) < 2:
            return None
        total_odd = 1.0
        comb_prob = 1.0
        for leg in legs:
            total_odd *= leg["odd"]
            comb_prob *= leg["prob"] / 100.0
        return {
            "name": name,
            "total_odd": round(total_odd, 2),
            "combined_prob": round(comb_prob * 100, 1),
            "legs": legs,
        }

    parleys = []
    p1 = make_parley("Parley Conservador (Top 3 Favoritos)", best_picks[:3])
    if p1:
        parleys.append(p1)

    value_legs = [p for p in best_picks if 50.0 <= p["prob"] <= 78.0][:4]
    if len(value_legs) < 3:
        value_legs = best_picks[:4]
    p2 = make_parley("Parley Equilibrado (4 Selecciones)", value_legs)
    if p2:
        parleys.append(p2)

    p3 = make_parley("Parley Cuota Alta (5 Selecciones)", best_picks[:5])
    if p3:
        parleys.append(p3)

    return parleys


def main():
    os.makedirs("data", exist_ok=True)
    output_path = os.path.join("data", "parleys.json")

    odds_api_key = os.environ.get("ODDS_API_KEY", "").strip()
    matches = []

    if odds_api_key:
        print("Consultando The Odds API...")
        matches = fetch_from_odds_api(odds_api_key)

    if not matches:
        print("Usando respaldo público de ESPN Soccer...")
        matches = fetch_from_espn_public()

    matches.sort(key=lambda m: m.get("date", ""))
    auto_parleys = generate_auto_parleys(matches)

    payload = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "total_matches": len(matches),
        "matches": matches,
        "auto_parleys": auto_parleys,
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"Guardado {output_path} con {len(matches)} partidos y {len(auto_parleys)} parleys sugeridos.")


if __name__ == "__main__":
    main()
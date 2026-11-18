import json
import urllib.request
from datetime import datetime, timedelta, timezone

LEAGUES = [
    {"slug": "eng.1", "name": "Premier League"},
    {"slug": "esp.1", "name": "LaLiga"},
    {"slug": "ita.1", "name": "Serie A"},
    {"slug": "ger.1", "name": "Bundesliga"},
    {"slug": "fra.1", "name": "Ligue 1"},
    {"slug": "uefa.champions", "name": "Champions League"},
    {"slug": "fifa.friendly", "name": "Fecha FIFA"},
    {"slug": "uefa.nations", "name": "Fecha FIFA"},
    {"slug": "concacaf.nations.league", "name": "Fecha FIFA"},
    {"slug": "fifa.worldq.conmebol", "name": "Fecha FIFA"},
    {"slug": "fifa.worldq.uefa", "name": "Fecha FIFA"},
    {"slug": "fifa.worldq.concacaf", "name": "Fecha FIFA"},
    {"slug": "bra.1", "name": "Brasileirão"},
    {"slug": "arg.1", "name": "Liga Argentina"},
    {"slug": "usa.1", "name": "MLS"},
]


def ml_to_prob(ml):
    ml = float(ml)
    if ml < 0:
        return abs(ml) / (abs(ml) + 100.0)
    return 100.0 / (ml + 100.0)


def prob_to_odd(prob_pct):
    safe_prob = max(int(prob_pct), 8)
    raw_odd = (100.0 / safe_prob) * 0.94
    return round(max(1.12, raw_odd), 2)


def fetch_league_matches(slug, league_name, date_range):
    url = (
        f"https://site.api.espn.com/apis/site/v2/sports/soccer/"
        f"{slug}/scoreboard?dates={date_range}"
    )
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (ZenDeckBot/1.0)"},
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
            seed = (len(home_name) * 7 + len(away_name) * 5) % 24
            p_home = 36 + seed
            p_draw = 26
            p_away = max(15, 100 - p_home - p_draw)

        matches.append(
            {
                "id": str(ev.get("id", "")),
                "league": league_name,
                "date": ev.get("date", ""),
                "home": home_name,
                "away": away_name,
                "odds": {
                    "home": prob_to_odd(p_home),
                    "draw": prob_to_odd(p_draw),
                    "away": prob_to_odd(p_away),
                },
                "probabilities": {
                    "home": p_home,
                    "draw": p_draw,
                    "away": p_away,
                },
            }
        )

    return matches


def build_recommended_parleys(matches):
    if len(matches) < 2:
        return []

    best_legs = []
    for m in matches:
        p_h = m["probabilities"]["home"]
        p_a = m["probabilities"]["away"]
        pick_home = p_h >= p_a
        best_legs.append(
            {
                "matchId": m["id"],
                "matchLabel": f"{m['home']} vs {m['away']}",
                "pick": "1" if pick_home else "2",
                "pickLabel": m["home"] if pick_home else m["away"],
                "odd": m["odds"]["home"] if pick_home else m["odds"]["away"],
                "prob": p_h if pick_home else p_a,
            }
        )

    sorted_legs = sorted(best_legs, key=lambda x: x["prob"], reverse=True)

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
        make_pack("Selección Alta Probabilidad", "Conservador", sorted_legs[:3]),
        make_pack("Combinada Balanceada", "Equilibrado", sorted_legs[1:5]),
    ]
    return [p for p in packs if p is not None]


def main():
    now_utc = datetime.now(timezone.utc)
    end_utc = now_utc + timedelta(days=14)
    date_range = f"{now_utc.strftime('%Y%m%d')}-{end_utc.strftime('%Y%m%d')}"

    all_matches = []
    seen_ids = set()

    for lg in LEAGUES:
        for m in fetch_league_matches(lg["slug"], lg["name"], date_range):
            if m["id"] and m["id"] not in seen_ids:
                seen_ids.add(m["id"])
                all_matches.append(m)

    all_matches.sort(key=lambda x: x.get("date", ""))

    # Hora local Honduras (UTC-6)
    hn_time = now_utc - timedelta(hours=6)
    payload = {
        "updated_at": hn_time.strftime("%d/%m/%Y, %I:%M %p"),
        "matches": all_matches,
        "recommended_parleys": build_recommended_parleys(all_matches),
    }

    with open("parleys.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"Generados {len(all_matches)} partidos en parleys.json")


if __name__ == "__main__":
    main()
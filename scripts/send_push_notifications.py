import json
import os
from datetime import datetime, timedelta, timezone
import requests
from pywebpush import webpush, WebPushException

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_EMAIL = os.environ.get("VAPID_CLAIMS_EMAIL", "mailto:ralz@zen-deck.app")

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}


def send_to_user(user_id: str, title: str, body: str, module: str = "dashboard-module", tag: str = "zen-alert"):
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.{user_id}&select=id,endpoint,p256dh,auth",
        headers=HEADERS,
        timeout=15,
    )
    if not resp.ok:
        return

    payload = json.dumps({"title": title, "body": body, "module": module, "tag": tag})
    for sub in resp.json():
        sub_info = {
            "endpoint": sub["endpoint"],
            "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]},
        }
        try:
            webpush(
                subscription_info=sub_info,
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_EMAIL},
            )
        except WebPushException as exc:
            if exc.response is not None and exc.response.status_code in (404, 410):
                requests.delete(
                    f"{SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.{sub['id']}",
                    headers=HEADERS,
                    timeout=10,
                )


def process_due_reminders():
    now = datetime.now(timezone.utc)
    window_end = (now + timedelta(minutes=20)).isoformat()
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/reminders?pushed_at=is.null&remind_at=lte.{window_end}&select=id,user_id,title",
        headers=HEADERS,
        timeout=15,
    )
    if not resp.ok:
        return
    for rem in resp.json():
        send_to_user(
            rem["user_id"],
            "Recordatorio · Zen Deck",
            rem["title"],
            module="dashboard-module",
            tag=f"rem-{rem['id']}",
        )
        requests.patch(
            f"{SUPABASE_URL}/rest/v1/reminders?id=eq.{rem['id']}",
            headers=HEADERS,
            json={"pushed_at": now.isoformat()},
            timeout=10,
        )


def notify_parleys_update():
    if not os.path.exists("data/parleys.json"):
        return
    with open("data/parleys.json", "r", encoding="utf-8") as f:
        pdata = json.load(f)
    if pdata.get("stale") or not pdata.get("matches"):
        return

    subs_resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/push_subscriptions?select=user_id",
        headers=HEADERS,
        timeout=15,
    )
    if not subs_resp.ok:
        return
    user_ids = sorted({row["user_id"] for row in subs_resp.json()})
    total = len(pdata["matches"])
    for uid in user_ids:
        send_to_user(
            uid,
            "Parleys actualizados · Zen Deck",
            f"{total} partidos y cuotas disponibles para hoy.",
            module="parleys-module",
            tag="parleys-daily",
        )


if __name__ == "__main__":
    if not (SUPABASE_URL and SERVICE_KEY and VAPID_PRIVATE_KEY):
        print("Faltan variables de entorno VAPID / Supabase; omitiendo envío Push.")
    else:
        process_due_reminders()
        notify_parleys_update()
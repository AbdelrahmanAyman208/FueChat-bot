import os

import requests
from dotenv import load_dotenv


def main() -> None:
    load_dotenv()
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise SystemExit("Missing GOOGLE_API_KEY in environment/.env")

    url = "https://generativelanguage.googleapis.com/v1beta/models"
    resp = requests.get(url, params={"key": api_key}, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    for m in data.get("models", []):
        name = m.get("name")
        display = m.get("displayName")
        methods = ", ".join(m.get("supportedGenerationMethods", []) or [])
        print(f"{name} | {display} | {methods}")


if __name__ == "__main__":
    main()

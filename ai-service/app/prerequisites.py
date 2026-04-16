from __future__ import annotations

import csv
import re
from pathlib import Path

from app.models import StudentProfile

MANUAL_PREREQ_CSV = Path("data/manual_prerequisites.csv")


def _split_codes(raw: str) -> list[str]:
    if not raw:
        return []
    cleaned = raw.strip()
    if not cleaned or "depends on selected elective" in cleaned.lower():
        return []
    parts = re.split(r",|/|;|\band\b|&", cleaned, flags=re.IGNORECASE)
    return [c.strip().upper() for c in parts if c.strip()]


def load_manual_prerequisites(path: Path = MANUAL_PREREQ_CSV) -> list[dict]:
    if not path.exists():
        return []

    rows: list[dict] = []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for r in reader:
            course_code = (r.get("course_code") or "").strip().upper()
            if not course_code:
                continue
            rows.append(
                {
                    "course_code": course_code,
                    "course_name": (r.get("course_name") or "").strip(),
                    "program": (r.get("program") or "").strip(),
                    "level": (r.get("level") or "").strip(),
                    "semester": (r.get("semester") or "").strip(),
                    "prerequisites": _split_codes(r.get("prerequisites") or ""),
                    "credits": (r.get("credits") or "").strip(),
                }
            )
    return rows


def build_manual_prereq_context(profile: StudentProfile) -> str:
    rows = load_manual_prerequisites()
    if not rows:
        return ""

    passed = set(profile.passed_courses)
    enrolled = set(profile.currently_enrolled)
    already_taken = passed | enrolled

    filtered: list[dict] = []
    semester_labels = {"fall", "spring", "summer"}
    for r in rows:
        if r["program"] and r["program"] != profile.program.value:
            continue
        if r["level"] and r["level"] != profile.level.value:
            continue
        # Apply semester filter only when CSV row uses real semester names.
        row_sem = (r["semester"] or "").strip().lower()
        if row_sem in semester_labels and r["semester"] != profile.current_semester.value:
            continue
        filtered.append(r)

    if not filtered:
        return ""

    lines = [
        "MANUAL PREREQUISITE RULES (from data/manual_prerequisites.csv)",
        "Use these rules as highest priority for eligibility checks.",
    ]
    for r in filtered:
        prereqs = r["prerequisites"]
        missing = [p for p in prereqs if p not in passed]
        eligible = (not missing) and (r["course_code"] not in already_taken)
        lines.append(
            "- {code} | name: {name} | credits: {credits} | prereqs: {pr} | missing: {miss} | eligible_now: {ok}".format(
                code=r["course_code"],
                name=r["course_name"] or "N/A",
                credits=r["credits"] or "N/A",
                pr=", ".join(prereqs) if prereqs else "None",
                miss=", ".join(missing) if missing else "None",
                ok="YES" if eligible else "NO",
            )
        )
    return "\n".join(lines)

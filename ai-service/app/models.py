"""
models.py
=========
Pydantic models for request/response validation.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# ─────────────────────────────────────────────────────────────
# Enums
# ─────────────────────────────────────────────────────────────

class Program(str, Enum):
    CS  = "Computer Science"
    AI  = "Artificial Intelligence"
    CS_SEC = "Cybersecurity"
    IS  = "Information Systems"
    DS  = "Data Science"


class AcademicLevel(str, Enum):
    FRESHMAN  = "Freshman"   # Level 1  (0–30 CH)
    SOPHOMORE = "Sophomore"  # Level 2  (31–60 CH)
    JUNIOR    = "Junior"     # Level 3  (61–90 CH)
    SENIOR    = "Senior"     # Level 4  (91+ CH)


class Semester(str, Enum):
    FALL   = "Fall"
    SPRING = "Spring"
    SUMMER = "Summer"


# ─────────────────────────────────────────────────────────────
# Student Profile
# ─────────────────────────────────────────────────────────────

class StudentProfile(BaseModel):
    """
    Represents a student's academic standing used for course advising.
    All fields are optional so the chatbot can work with partial info.
    """
    student_id: Optional[str] = Field(None, description="Student ID (optional)")
    name: Optional[str] = Field(None, description="Student name")
    program: Program = Field(..., description="Enrolled program")
    level: AcademicLevel = Field(..., description="Academic level")
    cgpa: float = Field(..., ge=0.0, le=4.0, description="Cumulative GPA (0–4)")
    earned_hours: int = Field(..., ge=0, description="Total credit hours earned so far")
    current_semester: Semester = Field(..., description="Current semester (Fall/Spring/Summer)")
    passed_courses: list[str] = Field(
        default_factory=list,
        description="List of course codes the student has already passed"
    )
    currently_enrolled: list[str] = Field(
        default_factory=list,
        description="Course codes currently being taken (in-progress)"
    )
    failed_courses: list[str] = Field(
        default_factory=list,
        description="Course codes failed (not yet re-taken)"
    )

    @field_validator('cgpa')
    @classmethod
    def round_cgpa(cls, v: float) -> float:
        return round(v, 2)

    @field_validator('passed_courses', 'currently_enrolled', 'failed_courses', mode='before')
    @classmethod
    def uppercase_codes(cls, v):
        if isinstance(v, list):
            return [c.upper().strip() for c in v]
        return v

    @property
    def completed_codes(self) -> set[str]:
        """All course codes counted as 'done' (passed or in-progress)."""
        return set(self.passed_courses) | set(self.currently_enrolled)

    def level_from_hours(self) -> AcademicLevel:
        """Infer level from earned hours if not explicitly set."""
        if self.earned_hours <= 30:
            return AcademicLevel.FRESHMAN
        elif self.earned_hours <= 60:
            return AcademicLevel.SOPHOMORE
        elif self.earned_hours <= 90:
            return AcademicLevel.JUNIOR
        return AcademicLevel.SENIOR

    # Max hours allowed per semester (per college regulations Article 8)
    @property
    def max_hours_allowed(self) -> int:
        if self.current_semester == Semester.SUMMER:
            return 9
        if self.cgpa >= 3.0:
            return 21
        elif self.cgpa >= 2.0:
            return 18
        else:
            return 15


# ─────────────────────────────────────────────────────────────
# API Request / Response Schemas
# ─────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    session_id: str = Field(..., description="Unique chat session identifier")
    message: str = Field(..., min_length=1, max_length=2000)
    student_profile: Optional[StudentProfile] = Field(
        None,
        description="Provide once at session start; reused for subsequent turns"
    )


class CourseRecommendation(BaseModel):
    code: str
    name: str
    credits: int
    reason: str
    prerequisite_met: bool


class ChatResponse(BaseModel):
    session_id: str
    answer: str
    recommended_courses: Optional[list[CourseRecommendation]] = None
    sources: Optional[list[str]] = None
    tokens_used: Optional[int] = None


class IngestRequest(BaseModel):
    pdf_path: Optional[str] = Field(
        None,
        description="Override default PDF path (must be accessible on server)"
    )
    rebuild: bool = Field(
        False,
        description="Force rebuild even if vector store already exists"
    )


class IngestResponse(BaseModel):
    status: str
    docs_extracted: int
    chunks_indexed: int
    vector_stores: list[str]

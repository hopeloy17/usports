
# 00. SOftware DEsign Document

## 1. Introduction

Hope & Zuriel
Team members: Hope, Debra, Yun, Zuriel, John

### 1.1 Purpose

USports is a student-to-student platform for organizing and joining campus pickup sports games. It solves facility availability constraints and scheduling friction by shifting game organization from isolated friend groups to the broader student body. This Software Requirements Specification (SRS) defines the Minimum Viable Product (MVP) scope, core functionality, and operational constraints for development, testing, and evaluation.

### 1.2 Intended Audience

* **Development Team & Future Maintainers:** System architecture, implementation scope, and future continuity.
* **Testers:** Acceptance criteria and expected system behavior.
* **Project Stakeholders & Evaluators:** Scope verification and functional alignment.

### 1.3 Intended Use

USports enables students to publish open games (specifying sport, location, schedule, and participant limits) or browse and join existing sessions.

The system operates as a free, student-driven service. It automatically tracks participant thresholds, issues "at-risk" warnings for under-subscribed games, and triggers auto-cancellation if the minimum headcount is not met by the defined cutoff time.

### 1.4 Product Scope

**In-Scope (MVP):**

* Account creation and self-reported skill profile (Beginner, Intermediate, Advanced).
* Event creation: Sport, venue, date/time, minimum threshold, and maximum capacity.
* Discovery: Browse upcoming events with sport and date filters.
* Participation management: Join/leave events with real-time roster counter updates.
* Automated notifications: At-risk capacity alerts and auto-cancellation triggers.

**Out-of-Scope (MVP):**

* Financial transactions or venue booking fees.
* Real-time chat, user ratings, or reputation scores.
* Automated skill-based matchmaking (skill levels serve as informational labels only).
* Facility reservation integration or study-session modules.

### 1.5 Definitions and Acronyms

| Term | Definition |
| --- | --- |
| **USports** | The web/mobile application described in this specification. |
| **Student** | The primary user role; can create, join, and leave events. |
| **Pickup Game / Event** | An informal, student-created sports session hosted on the platform. |
| **MVP** | Minimum Viable Product; the initial launch scope. |
| **Minimum Headcount / Threshold** | The required participant floor for a game to proceed. |
| **Maximum Headcount / Cap** | The upper limit of participants permitted for an event. |
| **Auto-Cancellation** | System deletion of an event failing to meet the threshold by the cutoff. |
| **At-Risk Notification** | Alert sent to registered users when an event is below its headcount floor. |

---

## 2. Overall Description

### 2.1 User Needs

* **Discovery:** Quickly locate open pickup games filtered by sport and schedule.
* **Low-Friction Joining:** Instantly join or leave games without direct recruitment.
* **Reliability:** Visibility into participant counts and automated confirmation/cancellation alerts to prevent showing up to dead games.

### 2.2 Assumptions and Dependencies

**Assumptions:**

1. Users are eligible students with compatible internet-connected devices.
2. Skill levels and event details are self-reported and unverified.
3. Users are independently responsible for facility access and physical attendance.
4. The system does not reserve or guarantee physical court/field access.

**Dependencies:**

* **Authentication Service:** Identity verification and account access.
* **Database Infrastructure:** Persistence layer for user profiles, event states, and rosters.
* **Notification Engine:** Event status, warning, and cancellation delivery.
* **Campus Venue Dataset:** Source data for standard campus facilities (if pre-populated).

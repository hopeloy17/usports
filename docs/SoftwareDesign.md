
# 00. Software Design Document

## 1. Introduction
Team members: Hope, Debra, Yun, Zuriel, John

Authors: Hope & Zuriel

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


## 3. System Features and Requirements

### 3.1 Functional Requirements

* **FR-1 (Event Creation):**
  * *Description:* Enables authenticated students to schedule and publish a new pickup game session with specific venue and capacity rules.
  * *EARS:* When an authenticated student submits the event creation form, the system shall validate and store the sport, venue, date/time, minimum headcount floor, and maximum player cap.

* **FR-2 (Roster Management):**
  * *Description:* Allows students to register for open games while enforcing capacity constraints in real time.
  * *EARS:* When a student selects "Join Game" and capacity is available, the system shall add the student to the active roster and increment the participant counter in real time.

* **FR-3 (Auto-Cancellation & Alerts):**
  * *Description:* Monitors participant counts against the headcount floor to clean up dead sessions and keep users informed.
  * *EARS:* When the cutoff time is reached and the current roster is below the minimum headcount threshold, the system shall mark the event as cancelled and issue notifications to all registered participants.

* **FR-4 (Game Discovery):**
  * *Description:* Provides a searchable and filterable catalog of upcoming games across campus.
  * *EARS:* When a user navigates to the discovery feed, the system shall display upcoming games filtered by sport and date.

### 3.2 Non-Functional Requirements
* **Performance:** 95% of game roster queries and filter operations should complete within $\le 300\text{ ms}$
* **Availability:** System uptime for discovery and roster updates shall maintain $\ge 99.5\%$.
* **Security:** All database reads and writes must enforce Row Level Security (RLS), restricting updates exclusively to the event creator or participating authenticated user.
* **Usability:** The interface must provide a mobile-first responsive layout allowing users to locate and register for an event within three distinct user actions from the home view.
* **Reliability:** State changes to participant rosters must be transactionally atomic to prevent race conditions or over-subscription beyond the defined maximum headcount.
* **Compliance:** The system must not collect, store, or process student education records governed by FERPA; all account profiles shall strictly contain student-submitted directory information.
* **Privacy:** Passwords and authentication credentials must never be stored in plaintext and must be delegated entirely to secure identity providers via Supabase Auth.

### 3.3 System Features
* **SF-1 (Real-Time Game Discovery & Filtering):**
  * *Description:* Students can browse a dynamic feed of open sessions filtered by sport category and date.
  * *Stimulus/Response:* When a user adjusts a filter, the list immediately refreshes to display qualifying games along with current headcount badges.

* **SF-2 (Pickup Event Creation & Parameter Setting):**
  * *Description:* Authenticated users can host an event by defining match rules and capacity thresholds.
  * *Stimulus/Response:* Upon form validation, the event is persisted to the database and made visible on the public discovery feed.

* **SF-3 (Live Roster Participation):**
  * *Description:* One-click join/leave functionality with live roster synchronization across active clients.
  * *Stimulus/Response:* When a participant joins, the headcount increments in real time for all viewing users; if capacity is reached, joining is disabled.

* **SF-4 (Automated Threshold Monitoring & Notifications):**
  * *Description:* Background monitoring of minimum headcount floors against event cutoff deadlines.
  * *Stimulus/Response:* If the minimum capacity is not met when the cutoff time elapses, the status transitions to cancelled and an automated alert is triggered for all registered participants.

## 4. Other Requirements

### 4.1 Database requirements
* **Platform & Persistence Engine:** The platform shall utilize a cloud-hosted relational database backend managed via Supabase (PostgreSQL 15+) to guarantee ACID compliance, transactional integrity, and automated backups.
* **Relational Schema Entities:** The database shall maintain structured relational entities for:
  * `profiles`: Unique student identifiers (`uuid`), campus email, display name, and self-reported skill tier (`beginner`, `intermediate`, `advanced`).
  * `events`: Event identifier, creator ID reference, sport classification, campus venue/location, start timestamp, decision cutoff timestamp, minimum capacity floor, maximum player ceiling, and status (`open`, `confirmed`, `cancelled`).
  * `event_participants`: Relational join table mapping participant IDs to event IDs with join timestamps and composite primary keys to prevent duplicate registrations.
* **Row-Level Security (RLS):** Security policies must be enforced directly at the Postgres layer:
  * Public/authenticated users have read-only access to open game listings.
  * Authenticated users may insert an event only when `auth.uid() = creator_id`; only the authenticated event creator may modify event details or trigger early cancellations.
  * Authenticated users may only insert or delete their own participation record (`auth.uid() = user_id`).
* **Realtime Synchronization:** The database shall leverage Postgres replication streams (Supabase Realtime) to broadcast roster count mutations directly to connected client applications without requiring polling or manual page reloads.
* **Automated Cutoff Evaluation:** The database environment must support scheduled cron triggers (pg_cron or Edge Functions) to evaluate upcoming game cutoff timestamps and transition under-subscribed events to `cancelled` status.
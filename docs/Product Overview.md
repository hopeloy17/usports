# USports - Product Overview

Draft v0.4 · September 24, 2026 · Software Engineering

## 1. Problem Statement

- Students who want to play a sport often don't have a group that is free, willing, and large enough at the same time - especially first-years and transfers.
- Existing friend groups are unreliable: someone plays soccer, but not weekly and not always with enough people for a real game.
- Pickup games are organized through fragmented channels (group chats, flyers, word of mouth), so people show up to empty courts or never find a game.
- Intramurals require a full team and a season-long commitment; there is no low-stakes on-ramp.
- Facilities are often booked or occupied by school teams, so even a willing group can't count on a court.

**The product:** any student opens a sports session to the whole student body, not just their friend group. Others see it and join; if enough join, the game happens. Free, restricted to one campus, and peer hosted. It lowers the stakes while also increasing the number of games that actually happen.

## 2. Goals

- Find or create a game in under a minute.
- Make it likely that a listed game actually happens (enough players, and they show up).
- Give students without a built-in group a low-pressure way to play and meet people.
- Ship a working, demoable MVP in 3–4 weeks with a team of 5.

### 2.1. Non-goals

- Payments, booking fees, venue booking, or staffed/paid games. Free for all students.
- Replacing the school's intramural registration, waivers, or eligibility checks.
- Multi-campus or city-wide expansion in the first release.
- Skill-based matchmaking or filtering in the MVP - skill is a display label only

## 3. MVP scope cut (3–4 weeks, team of 5)

**Build:**

- Sign-up and profile with sport interests + skill level
- Create event (sport, venue, time, headcount)
- Browse and filter the event feed
- Join / leave an event, with full-state handling
- Threshold-based at-risk notification + auto-cancellation

**Defer:**

- In-app chat (FR-25)
- Waitlist and promotion (FR-19, FR-24)
- Reliability scores and skill ratings (FR-27 - FR-38)
- Skill-based filtering or matching beyond a display label
- Intramural integration, venue directory, weather, badges
- Study sessions module (§10) - team decision

**Never:** payments and booking fees.

## 4. Competitive landscape

**City-scale** apps ([GoodRec]([www.goodrec.com](https://www.goodrec.com)), [Plei]([www.plei.com](https://www.plei.com)), [Pickup]([www.pickupgames.app](https://www.pickupgames.app)), [Pickuplay]([pickuplay.com](https://pickuplay.com))) do not focus on universities and run staffed or paid games. Not all of them are multi-sport.

**Campus-specific** attempts like First Pick at Penn State, Pick Up & Play at ETSU, Pickup at Notre Dame, Purdue Hoops) were student projects that stalled after launch - a cold-start problem: one campus, a few founders, no retention loop.

#### Differentiation:

Campus-only (.edu-gated), peer-hosted and free, and focused on games that actually happen rather than general event discovery. The threshold/auto-cancel mechanic mirrors how Plei handles under-filled games.

## 5. Functional requirements

Priority uses MoSCoW: **Must** = MVP (3–4 weeks), **Should** = v1.1, **Could** = v2.

### 5.1 Accounts and profiles


| ID   | Requirement                                                                                                                      | Priority | Scope |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------- |
| FR-1 | Sign up with a school (.edu) email; verify before accessing listings.                                                            | Must     | MVP   |
| FR-2 | Profile: name, optional photo, class year, sports played, self-rated skill level per sport (Beginner / Intermediate / Advanced). | Must     | MVP   |
| FR-3 | Edit profile later.                                                                                                              | Must     | MVP   |
| FR-4 | Block and report users; admins review reports and disable accounts.                                                              | Should   | v1.1  |
| FR-5 | Broadcast availability ("free for basketball on weekday evenings") so hosts can invite directly.                                 | Could    |       |
| FR-6 | Optional flag: "interested in study sessions" (only if §10 is built).                                                           | Could    |       |

### 5.2 Event creation


| ID    | Requirement                                                                                                            | Priority | Scope |
| ------- | ------------------------------------------------------------------------------------------------------------------------ | ---------- | ------- |
| FR-7  | Create a listing with sport, date/time, venue, minimum players, optional max/cap, optional skill label, optional note. | Must     | MVP   |
| FR-8  | Edit or cancel a listing and remove a player; affected players notified.                                               | Must     | MVP   |
| FR-9  | Recurring listings (e.g. every Tuesday at 7 pm).                                                                       | Should   | v1.1  |
| FR-11 | Equipment flag ("bring your own paddle" vs "host has extras").                                                         | Should   | v1.1  |
| FR-12 | After a game, "play again?" pre-fills a new listing with the same roster.                                              | Could    |       |

### 5.3 Discovery and joining


| ID    | Requirement                                                                       | Priority | Scope |
| ------- | ----------------------------------------------------------------------------------- | ---------- | ------- |
| FR-13 | Browse a feed of upcoming open events, filterable by sport and date.              | Must     | MVP   |
| FR-14 | Each listing shows joined vs. needed count ("4/8 joined") and the roster.         | Must     | MVP   |
| FR-15 | Games can be joined with 1-2 taps and others can see the roster.                  | Must     | MVP   |
| FR-16 | At cap, the listing is marked full - viewable, not joinable, until someone drops. | Must     | MVP   |
| FR-17 | Filter by skill level and spots remaining.                                        | Should   | v1.1  |
| FR-18 | Waitlist for full games with automatic promotion when someone drops.              | Should   | v2    |

### 5.5 Threshold and notifications


| ID    | Requirement                                                                                      | Priority | Scope |
| ------- | -------------------------------------------------------------------------------------------------- | ---------- | ------- |
| FR-19 | Each event has a minimum headcount to happen.                                                    | Must     | MVP   |
| FR-20 | Notifications for: player joined, game full, game cancelled, reminder one hour before.           | Must     | MVP   |
| FR-21 | Group chat for confirmed players, closing 24 h after the game.                                   | Should   | v1.1  |
| FR-22 | If the minimum isn't met ~1 hour before start, notify everyone joined that the event is at risk. | Must     | MVP   |
| FR-23 | If the minimum still isn't met by the cutoff, auto-cancel and notify everyone joined.            | Must     | MVP   |
| FR-24 | Waitlist-promotion notification.                                                                 | Should   | v2    |
| FR-25 | Rec office can push targeted announcements (e.g. registration deadlines) by sport.               | Could    |       |

### 5.6 Reliability and ratings - post-MVP


| ID    | Requirement                                                                                                                              | Priority | Scope |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------- |
| FR-26 | After the scheduled time, the host confirms the game happened and marks no-shows.                                                        | Should   | v1.2  |
| FR-27 | Visible reliability score per user (percentage of joined games attended).                                                                | Should   | v1.2  |
| FR-28 | One rating per sport, seeded from self-rating (FR-2),**Provisional** until ~10 rated games.                                              | Should   | v1.2  |
| FR-29 | Hosts mark a listing**Rated** or **Casual**; casual is the default. Only rated games affect ratings.                                     | Should   | v1.2  |
| FR-30 | Rated games require result entry (score for 1v1, rosters + winner for teams); at least one opposing player confirms, disputes discarded. | Should   | v1.2  |
| FR-31 | Glicko-2 for 1v1 sports, TrueSkill for team sports.                                                                                      | Should   | v1.2  |
| FR-32 | Show ratings with uncertainty (1500 ± 120) and as a tier; tier is the default view.                                                     | Should   | v1.2  |
| FR-33 | Users can hide their rating publicly while it still drives matchmaking.                                                                  | Should   | v1.2  |
| FR-34 | Cap rated games against the same opponent per week to discourage sandbagging.                                                            | Should   | v1.2  |
| FR-35 | Periodic re-centering to prevent deflation in a small pool.                                                                              | Could    |       |
| FR-36 | Filter listings by rating range; auto-balance teams from ratings.                                                                        | Could    |       |
| FR-37 | Opt-in per-sport campus leaderboard.                                                                                                     | Could    |       |

### 5.7 Intramural integration - post-MVP

Intramurals and pickup share the same problem - people who want to play but lack a group - so the app complements the school's registration system rather than duplicating it.


| ID    | Requirement                                                                                     | Priority | Scope |
| ------- | ------------------------------------------------------------------------------------------------- | ---------- | ------- |
| FR-38 | Free-agent board: students post what they're looking for; captains post open spots.             | Should   | v3    |
| FR-39 | Sub finder: "need N subs" with a hard deadline.                                                 | Should   | v3    |
| FR-40 | Export a recurring game's roster to pre-fill an intramural team registration.                   | Could    |       |
| FR-41 | Open scrimmages: IM teams host practices open to anyone.                                        | Could    |       |
| FR-42 | Facility-aware scheduling: import the rec office schedule (CSV/ICS) so hosts see booked venues. | Could    |       |
| FR-43 | IM games appear as read-only listings users can follow or volunteer as a sub for.               | Could    |       |

### 5.8 Campus and venues - post-MVP


| ID    | Requirement                                                         | Priority |
| ------- | --------------------------------------------------------------------- | ---------- |
| FR-44 | Campus venue directory with location and hours.                     | Could    |
| FR-45 | Weather check for outdoor listings with a suggested reschedule.     | Could    |
| FR-46 | Lightweight stats and badges (games played, sports tried, streaks). | Could    |

## 6. User stories

MVP has one role: **Student**. Any student can create an event and any student can join one.

Personas below describe needs the roadmap targets, not separate roles in the MVP:


| Persona           | Description                                   | Primary need                                | Scope |
| ------------------- | ----------------------------------------------- | --------------------------------------------- | ------- |
| Host              | Wants to organize a game for a specific sport | Fill a game quickly with people who show up | MVP   |
| Player            | Wants to play not necessarily organize;       | Find a game that fits their schedule        | MVP   |
| Captain           | Runs an intramural team                       | Find free agents and last-minute subs       | v2    |
| Rec staff / admin | Manages facilities and intramurals            | Reduce double-booking; moderate reports     | v2    |

### 6.1 Students


| # | As a... | I can...                                                 | So that...                                              | Scope |
| --- | --------- | ---------------------------------------------------------- | --------------------------------------------------------- | ------- |
| 1 | student | sign up with my school email                             | only real classmates see my games                       | MVP   |
| 2 | student | set my sports and rough skill level, and edit them later | the app reflects what I actually want to play           | MVP   |
| 3 | student | create an event with sport, venue, time, and headcount   | others know exactly what I'm organizing                 | MVP   |
| 4 | student | set a minimum number of players                          | the event doesn't happen if too few are interested      | MVP   |
| 5 | student | tag a skill level without blocking anyone                | people sense the pace without being shut out            | MVP   |
| 6 | student | browse and filter events by sport and date               | I don't scroll through irrelevant listings              | MVP   |
| 7 | student | see joined vs. needed before I join                      | I don't waste time on a full game                       | MVP   |
| 8 | student | join with one tap and leave if plans change              | committing is frictionless and the count stays accurate | MVP   |

### 6.2 Hosts


| # | As a... | I can...                                             | So that...                                | Scope |
| --- | --------- | ------------------------------------------------------ | ------------------------------------------- | ------- |
| 1 | host    | have the system auto-cancel under-filled games       | I don't have to track and cancel manually | MVP   |
| 2 | host    | see who's coming and message them as a group         | we can confirm details and a meeting spot | v1.1  |
| 3 | host    | mark no-shows after the game                         | flaky players are visible to future hosts | v1.1  |
| 4 | host    | auto-balance teams from ratings                      | games are competitive for everyone        | v2    |
| 5 | host    | mark a game rated and enter the result in a few taps | ratings stay accurate without much effort | v1.1  |

### 6.3 Players


| #  | As a...            | I can...                                     | So that...                          | Scope |
| ---- | -------------------- | ---------------------------------------------- | ------------------------------------- | ------- |
| 1  | joined player      | be warned when the game is at risk           | I'm not left showing up to nothing  | MVP   |
| 2  | joined player      | be told when it's officially cancelled       | I can make other plans              | MVP   |
| 3  | player             | get a reminder an hour before                | I don't forget or show up late      | MVP   |
| 4  | player             | join a waitlist for a full game              | I get in if someone drops           | v1.1  |
| 5  | player             | block or report someone                      | I feel safe meeting strangers       | v1.1  |
| 8  | competitive player | have a per-sport rating from my results      | I can find opponents at my level    | v1.1  |
| 9  | player             | confirm or dispute a result                  | nobody can game the rating system   | v1.1  |
| 10 | beginner           | keep my rating private and play casual games | I'm not scared off before I improve | v1.1  |

### 6.5 Captains - Post MVP


| # | As a... | I can...                           | So that...       | Scope |
| --- | --------- | ------------------------------------ | ------------------ | ------- |
| 1 | captain | find a sub two hours before a game | we don't forfeit | v1.1  |

### 6.4 Admins - Post MVP


| # | As a...          | I can...                                                 | So that...                          | Scope |
| --- | ------------------ | ---------------------------------------------------------- | ------------------------------------- | ------- |
| 1 | admin            | see flagged reports and disable accounts                 | the platform stays trustworthy      | v1.1  |
| 2 | rec staff member | publish the facility schedule once and see it in the app | students stop double-booking courts | v2    |

## 7. Non-functional requirements


| ID    | Requirement                                                                                                                     |
| ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| NFR-1 | Mobile-first (responsive web or native); creating a listing takes under 60 seconds.                                             |
| NFR-2 | Joined counts update in real time or on refresh; roster and chat near real time (WebSockets or ≤10 s polling) once chat ships. |
| NFR-3 | Privacy: exact location visible only to joined players; no public phone numbers or emails.                                      |
| NFR-4 | Data retention: chats purged after the game closes; deleted accounts anonymized in past rosters.                                |
| NFR-5 | Accessibility: keyboard-navigable, screen-reader labels, status never conveyed by color alone.                                  |
| NFR-6 | Security: secure auth and sessions, rate limiting on listing creation and messaging.                                            |
| NFR-7 | External schedule data abstracted behind an`ExternalSchedule` model so the source (CSV, ICS, API) can change.                   |
| NFR-8 | If ratings ship, calculations are deterministic and replayable from stored results so fixes can be applied retroactively.       |

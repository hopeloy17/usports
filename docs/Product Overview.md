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

- In-app chat ([FR-22](#fr-22))
- Waitlist and promotion ([FR-19](#fr-19), [FR-25](#fr-25))
- Reliability scores and skill ratings ([FR-27](#fr-27) - [FR-38](#fr-38))
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
| <a id="fr-1"></a>FR-1 | Sign up with a school (.edu) email; verify before accessing listings.                                                            | Must     | MVP   |
| <a id="fr-2"></a>FR-2 | Profile: name, optional photo, class year, sports played, self-rated skill level per sport (Beginner / Intermediate / Advanced). | Must     | MVP   |
| <a id="fr-3"></a>FR-3 | Optional short bio on the profile, visible to other signed-in students. | Must | MVP |
| <a id="fr-4"></a>FR-4 | Edit profile later.                                                                                                              | Must     | MVP   |
| <a id="fr-5"></a>FR-5 | Block and report users; admins review reports and disable accounts.                                                              | Should   | v1.1  |
| <a id="fr-6"></a>FR-6 | Broadcast availability ("free for basketball on weekday evenings") so hosts can invite directly.                                 | Could    |       |
| <a id="fr-7"></a>FR-7 | Optional flag: "interested in study sessions" (only if §10 is built).                                                           | Could    |       |

### 5.2 Event creation


| ID    | Requirement                                                                                                            | Priority | Scope |
| ------- | ------------------------------------------------------------------------------------------------------------------------ | ---------- | ------- |
| <a id="fr-8"></a>FR-8  | Create a listing with sport, date/time, venue, minimum players, optional max/cap, optional skill label, optional note. | Must     | MVP   |
| <a id="fr-9"></a>FR-9  | Edit or cancel a listing and remove a player; affected players notified.                                               | Must     | MVP   |
| <a id="fr-10"></a>FR-10  | Recurring listings (e.g. every Tuesday at 7 pm).                                                                       | Should   | v1.1  |
| <a id="fr-11"></a>FR-11 | Equipment flag ("bring your own paddle" vs "host has extras").                                                         | Should   | v1.1  |
| <a id="fr-12"></a>FR-12 | After a game, "play again?" pre-fills a new listing with the same roster.                                              | Could    |       |

### 5.3 Discovery and joining


| ID    | Requirement                                                                       | Priority | Scope |
| ------- | ----------------------------------------------------------------------------------- | ---------- | ------- |
| <a id="fr-13"></a>FR-13 | Browse a feed of upcoming open events, filterable by sport and date.              | Must     | MVP   |
| <a id="fr-14"></a>FR-14 | Each listing shows joined vs. needed count ("4/8 joined") and the roster.         | Must     | MVP   |
| <a id="fr-15"></a>FR-15 | Games can be joined with 1-2 taps and others can see the roster.                  | Must     | MVP   |
| <a id="fr-16"></a>FR-16 | Leave a joined event at any time before start; the joined count and roster update and the host is notified. | Must | MVP |
| <a id="fr-17"></a>FR-17 | At cap, the listing is marked full - viewable, not joinable, until someone drops. | Must     | MVP   |
| <a id="fr-18"></a>FR-18 | Filter by skill level and spots remaining.                                        | Should   | v1.1  |
| <a id="fr-19"></a>FR-19 | Waitlist for full games with automatic promotion when someone drops.              | Should   | v1.1    |

### 5.5 Threshold and notifications


| ID    | Requirement                                                                                      | Priority | Scope |
| ------- | -------------------------------------------------------------------------------------------------- | ---------- | ------- |
| <a id="fr-20"></a>FR-20 | Each event has a minimum headcount to happen.                                                    | Must     | MVP   |
| <a id="fr-21"></a>FR-21 | Notifications for: player joined, game full, game cancelled, reminder one hour before.           | Must     | MVP   |
| <a id="fr-22"></a>FR-22 | Group chat for confirmed players, closing 24 h after the game.                                   | Should   | v1.1  |
| <a id="fr-23"></a>FR-23 | If the minimum isn't met ~1 hour before start, notify everyone joined that the event is at risk. | Must     | MVP   |
| <a id="fr-24"></a>FR-24 | If the minimum still isn't met by the cutoff, auto-cancel and notify everyone joined.            | Must     | MVP   |
| <a id="fr-25"></a>FR-25 | Waitlist-promotion notification.                                                                 | Should   | v2    |
| <a id="fr-26"></a>FR-26 | Rec office can push targeted announcements (e.g. registration deadlines) by sport.               | Could    |       |

### 5.6 Reliability and ratings - post-MVP


| ID    | Requirement                                                                                                                              | Priority | Scope |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------- |
| <a id="fr-27"></a>FR-27 | After the scheduled time, the host confirms the game happened and marks no-shows.                                                        | Should   | v1.2  |
| <a id="fr-28"></a>FR-28 | Visible reliability score per user (percentage of joined games attended).                                                                | Should   | v1.2  |
| <a id="fr-29"></a>FR-29 | One rating per sport, seeded from self-rating (FR-2),**Provisional** until ~10 rated games.                                              | Should   | v1.2  |
| <a id="fr-30"></a>FR-30 | Hosts mark a listing**Rated** or **Casual**; casual is the default. Only rated games affect ratings.                                     | Should   | v1.2  |
| <a id="fr-31"></a>FR-31 | Rated games require result entry (score for 1v1, rosters + winner for teams); at least one opposing player confirms, disputes discarded. | Should   | v1.2  |
| <a id="fr-32"></a>FR-32 | Glicko-2 for 1v1 sports, TrueSkill for team sports.                                                                                      | Should   | v1.2  |
| <a id="fr-33"></a>FR-33 | Show ratings with uncertainty (1500 ± 120) and as a tier; tier is the default view.                                                     | Should   | v1.2  |
| <a id="fr-34"></a>FR-34 | Users can hide their rating publicly while it still drives matchmaking.                                                                  | Should   | v1.2  |
| <a id="fr-35"></a>FR-35 | Cap rated games against the same opponent per week to discourage sandbagging.                                                            | Should   | v1.2  |
| <a id="fr-36"></a>FR-36 | Periodic re-centering to prevent deflation in a small pool.                                                                              | Could    |       |
| <a id="fr-37"></a>FR-37 | Filter listings by rating range; auto-balance teams from ratings.                                                                        | Could    |       |
| <a id="fr-38"></a>FR-38 | Opt-in per-sport campus leaderboard.                                                                                                     | Could    |       |

### 5.7 Intramural integration - post-MVP

Intramurals and pickup share the same problem - people who want to play but lack a group - so the app complements the school's registration system rather than duplicating it.


| ID    | Requirement                                                                                     | Priority | Scope |
| ------- | ------------------------------------------------------------------------------------------------- | ---------- | ------- |
| <a id="fr-39"></a>FR-39 | Free-agent board: students post what they're looking for; captains post open spots.             | Should   | v3    |
| <a id="fr-40"></a>FR-40 | Sub finder: "need N subs" with a hard deadline.                                                 | Should   | v3    |
| <a id="fr-41"></a>FR-41 | Export a recurring game's roster to pre-fill an intramural team registration.                   | Could    |       |
| <a id="fr-42"></a>FR-42 | Open scrimmages: IM teams host practices open to anyone.                                        | Could    |       |
| <a id="fr-43"></a>FR-43 | Facility-aware scheduling: import the rec office schedule (CSV/ICS) so hosts see booked venues. | Could    |       |
| <a id="fr-44"></a>FR-44 | IM games appear as read-only listings users can follow or volunteer as a sub for.               | Could    |       |

### 5.8 Campus and venues - post-MVP


| ID    | Requirement                                                         | Priority |
| ------- | --------------------------------------------------------------------- | ---------- |
| <a id="fr-45"></a>FR-45 | Campus venue directory with location and hours.                     | Could    |
| <a id="fr-46"></a>FR-46 | Weather check for outdoor listings with a suggested reschedule.     | Could    |
| <a id="fr-47"></a>FR-47 | Lightweight stats and badges (games played, sports tried, streaks). | Could    |

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


| # | As a... | I can...                                                 | So that...                                              | Scope | Related FRs |
| --- | --------- | ---------------------------------------------------------- | --------------------------------------------------------- | ------- | --- |
| 1 | student | sign up with my school email                             | only real classmates see my information                 | MVP   | [FR-1](#fr-1) |
| 2 | student | create a profile with name, photo, bio, and other data   | other students will have confidence that its me         | MVP   | [FR-2](#fr-2), [FR-3](#fr-3) |
| 3 | student | set my sports and rough skill level, and edit them later | the app reflects what I actually want to play           | MVP   | [FR-2](#fr-2), [FR-4](#fr-4) |
| 4 | student | browse and filter events by sport and date               | I don't scroll through irrelevant listings              | MVP   | [FR-13](#fr-13) |
| 5 | student | see joined vs. needed before I join                      | I don't waste time on a full game                       | MVP   | [FR-14](#fr-14), [FR-17](#fr-17) |
| 6 | student | join with one tap and leave if plans change              | committing is frictionless and the count stays accurate | MVP   | [FR-15](#fr-15), [FR-16](#fr-16), [FR-17](#fr-17) |

### 6.2 Hosts


| # | As a... | I can...                                               | So that...                                              | Scope | Related FRs |
| --- | --------- | ------------------------------------------------------ | ----------------------------------------------------------- | ------- | --- |
| 1 | host    | create an event with sport, venue, time, and headcount | others know exactly what I'm organizing                 | MVP   | [FR-8](#fr-8) |
| 2 | host    | set a minimum number of players                        | the event doesn't happen if too few are interested      | MVP   | [FR-8](#fr-8), [FR-20](#fr-20) |
| 3 | student | tag a skill level without blocking anyone                | people sense the pace without being shut out            | MVP   | [FR-8](#fr-8) |
| 4 | host    | have the system auto-cancel under-filled games         | I don't have to track and cancel manually               | MVP   | [FR-23](#fr-23), [FR-24](#fr-24) |
| 5 | host    | see who's coming and message them as a group           | we can confirm details and a meeting spot               | v1.2  | [FR-14](#fr-14), [FR-22](#fr-22) |
| 6 | host    | mark no-shows after the game                           | flaky players are visible to future hosts               | v1.1  | [FR-27](#fr-27), [FR-28](#fr-28) |
| 7 | host    | auto-balance teams from ratings                        | games are competitive for everyone                      | v1.2    | [FR-37](#fr-37) |
| 8 | host    | mark a game rated and enter the result in a few taps   | ratings stay accurate without much effort               | v1.1  | [FR-30](#fr-30), [FR-31](#fr-31) |

### 6.3 Players


| #  | As a...            | I can...                                     | So that...                          | Scope | Related FRs |
| ---- | -------------------- | ---------------------------------------------- | ------------------------------------- | ------- | --- |
| 1  | joined player      | be warned when the game is at risk           | I'm not left showing up to nothing  | MVP   | [FR-23](#fr-23) |
| 2  | joined player      | be told when it's officially cancelled       | I can make other plans              | MVP   | [FR-21](#fr-21), [FR-24](#fr-24) |
| 3  | player             | get a reminder an hour before                | I don't forget or show up late      | MVP   | [FR-21](#fr-21) |
| 4  | player             | join a waitlist for a full game              | I get in if someone drops           | v1.1  | [FR-19](#fr-19), [FR-25](#fr-25) |
| 5  | player             | block or report someone                      | I feel safe meeting strangers       | v1.1  | [FR-5](#fr-5) |
| 8  | competitive player | have a per-sport rating from my results      | I can find opponents at my level    | v1.2  | [FR-29](#fr-29), [FR-32](#fr-32), [FR-33](#fr-33) |
| 9  | player             | confirm or dispute a result                  | nobody can game the rating system   | v1.2  | [FR-31](#fr-31) |
| 10 | beginner           | keep my rating private and play casual games | I'm not scared off before I improve | v1.2  | [FR-30](#fr-30), [FR-34](#fr-34) |

### 6.5 Captains - Post MVP


| # | As a... | I can...                           | So that...       | Scope | Related FRs |
| --- | --------- | ------------------------------------ | ------------------ | ------- | --- |
| 1 | captain | find a sub two hours before a game | we don't forfeit | v1.1  | [FR-40](#fr-40), [FR-44](#fr-44) |

### 6.4 Admins - Post MVP


| # | As a...          | I can...                                                 | So that...                          | Scope | Related FRs |
| --- | ------------------ | ---------------------------------------------------------- | ------------------------------------- | ------- | --- |
| 1 | admin            | see flagged reports and disable accounts                 | the platform stays trustworthy      | v1.1  | [FR-5](#fr-5) |
| 2 | rec staff member | publish the facility schedule once and see it in the app | students stop double-booking courts | v2    | [FR-43](#fr-43) |

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

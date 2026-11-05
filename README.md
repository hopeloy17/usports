# USports

The official monorepo for the Fall 2026 CS262 Group A
Team Members: Debra Anumnu, Hope Eloy, John Neumann, Yun Kim and Zuriel Olu-Silas

### Vision Statement
For college students who want to find people to play pickup sports with but don't have time for intramurals, USports is a mobile app that lets students safely host and join pickup games on campus in real time. Unlike paid scheduling apps or disorganized group chats where invites often go unanswered, USports makes it fast and reliable to fill a game.

### Starting Server and Client

To start the server, go to the root directory and run 
```bash
npm run dev:server
```
To start the client, go to the root directory and run 
```bash
npm start --prefix client
```

### Database Setup
1. Accept your email invitation to the **usports-db** project on Supabase (using your Calvin emails).
2. Navigate to **Project Settings** (`⚙️`) -> **API Keys** in the Supabase Dashboard.
3. In `/server`, create a `.env` file based on the template `.env.example`
4.  Replace the placeholders for `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` with project credentials from Supabase.
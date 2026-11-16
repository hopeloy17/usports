import { app } from "./app";
import { startAtRiskNotifier } from "./services/atRiskNotifier";

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`USports server running on port ${port}`);
});

// Started here rather than in app.ts so tests that import the app don't start a timer
startAtRiskNotifier();

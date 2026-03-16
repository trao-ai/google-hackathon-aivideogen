import dotenv from "dotenv";
import path from "path";

// Load .env from monorepo root (two levels up from apps/api)
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import app from "./app";

const PORT = process.env.PORT ?? 3001;

app.listen(PORT, () => {
  console.log(`🚀 Atlas API running on http://localhost:${PORT}`);
});

export default app;

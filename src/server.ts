import "dotenv/config";
import app from "./app.js";
import { connectToDatabase } from "./config/database.js";

const port = Number(process.env.PORT ?? 3000);

await connectToDatabase();
app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
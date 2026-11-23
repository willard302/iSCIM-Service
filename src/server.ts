import app from "./app.js";

const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT ?? 3000);

app.listen(port, "0.0.0.0", () => console.log(
  isProduction ? `✅ Server running on port ${port}` : `🧪 Dev server running at http://localhost:${port}`
));

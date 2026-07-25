// Vercel serverless entry point
// This file is used by Vercel to serve the application as a serverless function.
// It re-exports the Hono app object, which Vercel can invoke directly.

export { app as default } from "../src/index.js";

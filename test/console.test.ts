import { describe, it, expect } from "vitest";
import { app } from "../src/index.js";

describe("GET /console", () => {
  it("returns HTML 200", async () => {
    const res = await app.request("/console");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/html/);
  });

  it("contains key UI elements", async () => {
    const res = await app.request("/console");
    const body = await res.text();
    expect(body).toContain("Actor Console");
    expect(body).toContain("Dashboard");
    expect(body).toContain("Actors");
    expect(body).toContain("Runs");
    expect(body).toContain("Schedules");
    expect(body).toContain("Storage");
    expect(body).toContain("Marketplace");
    expect(body).toContain("Billing");
    expect(body).toContain("Admin");
  });

  it("contains dashboard render function and stat card CSS", async () => {
    const res = await app.request("/console");
    const body = await res.text();
    expect(body).toContain("function renderDashboard()");
    expect(body).toContain("stat-grid");
    expect(body).toContain("stat-card");
    expect(body).toContain("stat-value");
    expect(body).toContain("stat-label");
  });

  it("contains marketplace render functions", async () => {
    const res = await app.request("/console");
    const body = await res.text();
    expect(body).toContain("function renderMarketplace()");
    expect(body).toContain("function renderMarketplaceListing()");
    expect(body).toContain("Public actor marketplace");
    expect(body).toContain("Run This Actor");
    expect(body).toContain("function approveListing(");
    expect(body).toContain("function rejectListing(");
  });

  it("renders token login overlay", async () => {
    const res = await app.request("/console");
    const body = await res.text();
    expect(body).toContain("token-input");
    expect(body).toContain("Connect");
    expect(body).toContain("Enter an API token to connect");
    expect(body).toContain("login-overlay");
  });

  it("contains token management JavaScript", async () => {
    const res = await app.request("/console");
    const body = await res.text();
    expect(body).toContain("function getToken()");
    expect(body).toContain("function setToken(t)");
    expect(body).toContain("function clearToken()");
    expect(body).toContain("function isAuthed()");
    expect(body).toContain("localStorage.getItem");
    expect(body).toContain("localStorage.setItem");
    expect(body).toContain("localStorage.removeItem");
  });

  it("includes Authorization header in api() requests when token present", async () => {
    const res = await app.request("/console");
    const body = await res.text();
    expect(body).toContain("authorization");
    expect(body).toContain("Bearer ");
    expect(body).toContain("'Bearer '+token");
  });

  it("handles 401 by clearing token and showing login overlay", async () => {
    const res = await app.request("/console");
    const body = await res.text();
    expect(body).toContain("r.status===401");
    expect(body).toContain("clearToken()");
    expect(body).toContain("login-overlay");
    expect(body).toContain("Token expired or invalid");
  });

  it("includes logout button and clear logic", async () => {
    const res = await app.request("/console");
    const body = await res.text();
    expect(body).toContain("logout-btn");
    expect(body).toContain("Logout");
    expect(body).toContain("function logout()");
    expect(body).toContain("clearToken()");
    expect(body).toContain("Disconnect?");
  });
});

describe("GET /openapi.json", () => {
  it("returns 200 with valid OpenAPI spec", async () => {
    const res = await app.request("/openapi.json");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/json/);
    const body = await res.json() as { openapi: string; info: { title: string } };
    expect(body.openapi).toBe("3.1.0");
    expect(body.info.title).toBe("Actor Platform API");
  });
});

describe("GET /docs", () => {
  it("returns HTML 200 with Swagger UI", async () => {
    const res = await app.request("/docs");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/html/);
    const body = await res.text();
    expect(body).toContain("swagger-ui");
    expect(body).toContain("/openapi.json");
  });
});

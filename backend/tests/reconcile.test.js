require('./setUpMock.js');
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const reconcileRoute = require('../api/reconcile');

const app = express();
app.use(bodyParser.json());
app.use('/api/reconcile', reconcileRoute);

describe("/api/reconcile/medication endpoint", () => {

  test("1. Reconciliation with multiple sources (cache miss)", async () => {
    const input = {
      patient_context: { age: 67 },
      sources: [
        { system: "Hospital", medication: "Metformin 1000mg", last_updated: "2024-10-15", source_reliability: "high" },
        { system: "Primary Care", medication: "Metformin 500mg", last_updated: "2025-01-20", source_reliability: "high" }
      ]
    };

    const response = await request(app)
      .post('/api/reconcile/medication')
      .send(input);

    expect(response.status).toBe(200);
    expect(response.body.reconciled_medication).toBe("Metformin 500mg twice daily");
    expect(response.body.reasoning).toBe("Mocked AI reasoning");
    expect(response.body.confidence_score).toBe(0.88);
    expect(response.body.clinical_safety_check).toBe("PASSED");
  });

  test("2. Reconciliation with cache hit", async () => {
    const db = require('../db/db');
    // simulate cache hit
    db.get.mockImplementationOnce((query, params, cb) => {
      cb(null, { output: JSON.stringify({
        reconciled_medication: "CachedMed 50mg",
        confidence_score: 0.9,
        reasoning: "Cached reasoning",
        recommended_actions: [],
        clinical_safety_check: "PASSED"
      }) });
    });

    const input = { patient_context: {}, sources: [{ system: "Clinic", medication: "Lisinopril 20mg", source_reliability: "high" }] };

    const response = await request(app)
      .post('/api/reconcile/medication')
      .send(input);

    expect(response.status).toBe(200);
    expect(response.body.reconciled_medication).toBe("CachedMed 50mg");
    expect(response.body.reasoning).toBe("Cached reasoning");
  });

  test("3. Rate limit exceeded returns 429", async () => {
    const rateLimiter = require('../utils/rateLimiter');
    rateLimiter.checkRateLimit.mockReturnValueOnce({ allowed: false, retryAfter: 10 });

    const input = { patient_context: {}, sources: [{ system: "Clinic", medication: "Lisinopril", source_reliability: "medium" }] };

    const response = await request(app)
      .post('/api/reconcile/medication')
      .send(input);

    expect(response.status).toBe(429);
    expect(response.body.error).toMatch(/Rate limit exceeded/i);
  });

  test("4. Invalid AI response returns 500", async () => {
    const ai = require('../AI/gemini');
    ai.generateClinicalReasoning.mockImplementationOnce(() => Promise.resolve("invalid json"));

    const input = { patient_context: {}, sources: [{ system: "Clinic", medication: "Lisinopril", source_reliability: "high" }] };

    const response = await request(app)
      .post('/api/reconcile/medication')
      .send(input);

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Invalid AI response format");
  });

});
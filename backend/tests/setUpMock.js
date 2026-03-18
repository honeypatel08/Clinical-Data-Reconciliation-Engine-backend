// Mock AI module
jest.mock('../AI/gemini', () => ({
  generateClinicalReasoning: jest.fn(() => Promise.resolve(JSON.stringify({
    reconciled_medication: "Metformin 500mg twice daily",
    confidence_score: 0.88,
    reasoning: "Mocked AI reasoning",
    recommended_actions: ["Verify prescription with clinician"],
    clinical_safety_check: "PASSED"
  })))
}));

// Mock DB module
jest.mock('../db/db', () => ({
  get: jest.fn((query, params, cb) => cb(null, null)), // default cache miss
  run: jest.fn((query, params, cb) => cb(null))
}));

// Mock auth middleware
jest.mock('../middleware/middleware', () => ({
  authenticateUser: (req, res, next) => {
    req.user = { id: "testUser" };
    next();
  }
}));

// Mock rate limiter
jest.mock('../utils/rateLimiter', () => ({
  checkRateLimit: jest.fn(() => ({ allowed: true }))
}));
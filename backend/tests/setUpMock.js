// AI module
jest.mock('../AI/gemini', () => ({
  generateClinicalReasoning: jest.fn(() =>
    Promise.resolve(JSON.stringify({
      reconciled_medication: "Metformin 500mg twice daily",
      confidence_score: 0.88,
      reasoning: "Mocked AI reasoning",
      recommended_actions: ["Verify prescription with clinician"],
      clinical_safety_check: "PASSED"
    }))
  )
}));

// PostgreSQL pool
jest.mock('../db/db', () => ({
  query: jest.fn((text, params) => {
    if (text.includes('FROM ai_cache')) {
      return Promise.resolve({ rows: [] });
    }
    return Promise.resolve({ rowCount: 1, rows: [] });
  })
}));

// auth middleware
jest.mock('../middleware/middleware', () => ({
  authenticateUser: (req, res, next) => {
    req.user = { id: "testUser" };
    next();
  }
}));

//rate limiter
jest.mock('../utils/rateLimiter', () => ({
  checkRateLimit: jest.fn(() => ({ allowed: true }))
}));
const userLastCallMap = new Map();

function checkRateLimit(userId, windowMs = 30000) {
  const now = Date.now();
  const lastCall = userLastCallMap.get(userId);

  if (lastCall && (now - lastCall) < windowMs) {
    const remaining = Math.ceil((windowMs - (now - lastCall)) / 1000);
    return { allowed: false, retryAfter: remaining };
  }

  userLastCallMap.set(userId, now); // add if not exist
  return { allowed: true };
}

module.exports = { checkRateLimit };
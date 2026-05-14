function parseEnvBool(value) {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return undefined;
}

function isPresent(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function computeGoogleOAuthState(env = process.env) {
  const requiredVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL'];
  const missingVars = requiredVars.filter((key) => !isPresent(env[key]));

  const flag = parseEnvBool(env.GOOGLE_OAUTH_ENABLED);
  if (flag === false) {
    return {
      enabled: false,
      reason: 'GOOGLE_OAUTH_ENABLED is false',
      missingVars,
      config: null,
    };
  }

  if (missingVars.length > 0) {
    return {
      enabled: false,
      reason: `Missing env vars: ${missingVars.join(', ')}`,
      missingVars,
      config: null,
    };
  }

  return {
    enabled: true,
    reason: flag === true ? 'GOOGLE_OAUTH_ENABLED is true' : 'Credentials present',
    missingVars: [],
    config: {
      clientID: env.GOOGLE_CLIENT_ID.trim(),
      clientSecret: env.GOOGLE_CLIENT_SECRET.trim(),
      callbackURL: env.GOOGLE_CALLBACK_URL.trim(),
      proxy: true,
    },
  };
}

module.exports = {
  computeGoogleOAuthState,
};


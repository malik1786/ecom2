const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const supabase = require('./supabaseClient');
const { computeGoogleOAuthState } = require('./googleOAuth');

const googleOAuth = computeGoogleOAuthState();

// ── TASK 3: OAuth Environment Debug ──────────────────────────────────────────
console.log('------------------------------------------------');
console.log('[OAUTH-DEBUG] Registering Google Strategy...');
console.log('[OAUTH-DEBUG] CLIENT ID =', process.env.GOOGLE_CLIENT_ID || '⚠️  MISSING');
console.log('[OAUTH-DEBUG] CALLBACK  =', process.env.GOOGLE_CALLBACK_URL || '⚠️  MISSING');
console.log('[OAUTH-DEBUG] FRONTEND  =', process.env.FRONTEND_URL || 'http://127.0.0.1:5173 (default)');
console.log('[OAUTH-DEBUG] ENABLED   =', googleOAuth.enabled, '|', googleOAuth.reason);
console.log('------------------------------------------------');

if (googleOAuth.enabled) {
  passport.use(
    new GoogleStrategy(googleOAuth.config, async (accessToken, refreshToken, profile, done) => {
      console.log('---------------------------------------------------------');
      console.log('📬 [PASSPORT-DEBUG] Google Profile Received');
      console.log(`[PASSPORT-DEBUG] ID: ${profile.id}`);
      console.log(`[PASSPORT-DEBUG] Email: ${profile?.emails?.[0]?.value}`);
      console.log('---------------------------------------------------------');
      
      try {
        const email = profile?.emails?.[0]?.value;
        if (!email) {
          return done(new Error('Google profile did not include an email address.'), null);
        }

        // 1. Check if user exists with this email
        const { data: users, error: findError } = await supabase
          .from('customers')
          .select('*')
          .eq('email', email)
          .limit(1);

        if (findError) throw findError;

        let user = users && users.length > 0 ? users[0] : null;

        if (user) {
          console.log(`✅ [PASSPORT-DEBUG] Existing User Found: ${user.email}`);
          return done(null, user);
        }

        // 2. Auto-create user if not exists
        console.log(`🆕 [PASSPORT-DEBUG] Creating New User: ${email}`);
        const { data: newUser, error: createError } = await supabase
          .from('customers')
          .insert([
            { 
              email, 
              full_name: profile.displayName || email.split('@')[0],
              avatar_url: profile?.photos?.[0]?.value, // Capture avatar
              google_id: profile.id,
              is_active: true
            }
          ])
          .select()
          .single();

        if (createError) throw createError;

        return done(null, newUser);
      } catch (err) {
        console.error('❌ [AUTH-DB-ERROR]:', err.message);
        return done(err, null);
      }
    }),
  );
}
 else {
  console.warn(`[auth] Google OAuth disabled: ${googleOAuth.reason}`);
}

// No session used (stateless JWT)
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

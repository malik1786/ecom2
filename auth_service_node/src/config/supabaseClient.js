const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Create a mock client if keys are missing to prevent fatal crash
let supabase;

if (supabaseUrl && supabaseKey && supabaseUrl !== 'https://your-project.supabase.co') {
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    console.error('❌ [SUPABASE] Missing or Placeholder URL/Key in environment variables. Database features will be DISABLED.');
    // Mock object to prevent 'undefined' errors elsewhere
    supabase = {
        from: () => ({
            select: () => ({ eq: () => ({ limit: () => Promise.resolve({ data: [], error: { message: 'Supabase Not Configured' } }) }) }),
            insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Supabase Not Configured' } }) }) })
        })
    };
}

module.exports = supabase;

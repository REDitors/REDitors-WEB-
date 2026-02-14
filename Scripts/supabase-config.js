const SUPABASE_CONFIG = {
    url: 'https://rnruqyeduwmgrpqttamw.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJucnVxeWVkdXdtZ3JwcXR0YW13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MzgwOTksImV4cCI6MjA4NTAxNDA5OX0.aKAiiQN2wz-nU4TR8FgRM5U4bZDuzXB6SfKo81ka9B8'
};

// Singleton pattern to ensure only one client exists
if (!window.supabaseClient) {
    try {
        window.supabaseClient = window.supabase.createClient(
            SUPABASE_CONFIG.url, 
            SUPABASE_CONFIG.anonKey,
            {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true,
                    flowType: 'pkce'
                }
            }
        );
        console.log('✅ Supabase Linked');
    } catch (error) {
        console.error('❌ Supabase Connection Error:', error);
    }
}

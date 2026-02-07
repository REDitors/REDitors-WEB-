-- ====================================
-- REDitors Voice-to-Text PRO
-- Supabase Database Schema
-- ====================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================
-- Users Table
-- Stores user profiles and credits
-- ====================================

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    credits INTEGER DEFAULT 10,
    openai_api_key TEXT,
    total_transcriptions INTEGER DEFAULT 0,
    total_minutes_transcribed DECIMAL(10, 2) DEFAULT 0,
    subscription_tier TEXT DEFAULT 'free',
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}'::JSONB
);

-- Add indexes for better performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_credits ON public.users(credits);
CREATE INDEX idx_users_created_at ON public.users(created_at);

-- ====================================
-- Transactions Table
-- Tracks credit purchases and usage
-- ====================================

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'bonus')),
    description TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);

-- ====================================
-- Transcriptions Table
-- Stores transcription history
-- ====================================

CREATE TABLE IF NOT EXISTS public.transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    clip_name TEXT,
    duration_seconds DECIMAL(10, 2),
    word_count INTEGER,
    segment_count INTEGER,
    language TEXT,
    model TEXT,
    credits_used INTEGER,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    transcription_text TEXT,
    segments JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes
CREATE INDEX idx_transcriptions_user_id ON public.transcriptions(user_id);
CREATE INDEX idx_transcriptions_status ON public.transcriptions(status);
CREATE INDEX idx_transcriptions_created_at ON public.transcriptions(created_at);

-- ====================================
-- Credit Packages Table
-- Available credit packages for purchase
-- ====================================

CREATE TABLE IF NOT EXISTS public.credit_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    price_usd DECIMAL(10, 2) NOT NULL,
    price_per_credit DECIMAL(10, 4),
    popular BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default credit packages
INSERT INTO public.credit_packages (name, credits, price_usd, price_per_credit, popular, description)
VALUES
    ('Starter', 50, 10.00, 0.20, FALSE, 'Perfect for getting started'),
    ('Pro', 200, 35.00, 0.175, TRUE, 'Most popular for regular users'),
    ('Business', 500, 80.00, 0.16, FALSE, 'Best value for professionals'),
    ('Enterprise', 1000, 150.00, 0.15, FALSE, 'For teams and studios')
ON CONFLICT DO NOTHING;

-- ====================================
-- Row Level Security (RLS) Policies
-- ====================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Transactions policies
CREATE POLICY "Users can view own transactions"
    ON public.transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
    ON public.transactions FOR INSERT
    WITH CHECK (true);

-- Transcriptions policies
CREATE POLICY "Users can view own transcriptions"
    ON public.transcriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transcriptions"
    ON public.transcriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transcriptions"
    ON public.transcriptions FOR UPDATE
    USING (auth.uid() = user_id);

-- Credit packages policies (public read access)
CREATE POLICY "Anyone can view credit packages"
    ON public.credit_packages FOR SELECT
    USING (active = true);

-- ====================================
-- Functions and Triggers
-- ====================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Trigger for credit_packages table
CREATE TRIGGER update_credit_packages_updated_at
    BEFORE UPDATE ON public.credit_packages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name, credits)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
        10
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Log welcome credits
    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (NEW.id, 10, 'bonus', 'Welcome bonus credits');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Function to update last login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users
    SET last_login_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for login tracking (optional)
-- Note: This requires auth.sessions table access
-- CREATE TRIGGER on_user_login
--     AFTER INSERT ON auth.sessions
--     FOR EACH ROW
--     EXECUTE FUNCTION update_last_login();

-- ====================================
-- Utility Functions
-- ====================================

-- Function to get user credit balance
CREATE OR REPLACE FUNCTION get_user_credits(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    credit_balance INTEGER;
BEGIN
    SELECT credits INTO credit_balance
    FROM public.users
    WHERE id = user_uuid;
    
    RETURN COALESCE(credit_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add credits to user
CREATE OR REPLACE FUNCTION add_credits(
    user_uuid UUID,
    credit_amount INTEGER,
    transaction_type TEXT,
    transaction_desc TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update user credits
    UPDATE public.users
    SET credits = credits + credit_amount
    WHERE id = user_uuid;
    
    -- Log transaction
    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (user_uuid, credit_amount, transaction_type, transaction_desc);
    
    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct credits
CREATE OR REPLACE FUNCTION deduct_credits(
    user_uuid UUID,
    credit_amount INTEGER,
    transaction_desc TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    current_credits INTEGER;
BEGIN
    -- Check current balance
    SELECT credits INTO current_credits
    FROM public.users
    WHERE id = user_uuid;
    
    -- Check if enough credits
    IF current_credits < credit_amount THEN
        RAISE EXCEPTION 'Insufficient credits';
    END IF;
    
    -- Deduct credits
    UPDATE public.users
    SET credits = credits - credit_amount
    WHERE id = user_uuid;
    
    -- Log transaction
    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (user_uuid, -credit_amount, 'usage', transaction_desc);
    
    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log transcription
CREATE OR REPLACE FUNCTION log_transcription(
    user_uuid UUID,
    clip_name_param TEXT,
    duration_param DECIMAL,
    word_count_param INTEGER,
    segment_count_param INTEGER,
    language_param TEXT,
    model_param TEXT,
    credits_param INTEGER,
    transcription_text_param TEXT,
    segments_param JSONB
)
RETURNS UUID AS $$
DECLARE
    transcription_id UUID;
BEGIN
    INSERT INTO public.transcriptions (
        user_id,
        clip_name,
        duration_seconds,
        word_count,
        segment_count,
        language,
        model,
        credits_used,
        transcription_text,
        segments,
        completed_at
    )
    VALUES (
        user_uuid,
        clip_name_param,
        duration_param,
        word_count_param,
        segment_count_param,
        language_param,
        model_param,
        credits_param,
        transcription_text_param,
        segments_param,
        NOW()
    )
    RETURNING id INTO transcription_id;
    
    -- Update user stats
    UPDATE public.users
    SET 
        total_transcriptions = total_transcriptions + 1,
        total_minutes_transcribed = total_minutes_transcribed + (duration_param / 60)
    WHERE id = user_uuid;
    
    RETURN transcription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================
-- Views for Analytics
-- ====================================

-- User statistics view
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.email,
    u.display_name,
    u.credits,
    u.total_transcriptions,
    u.total_minutes_transcribed,
    COUNT(t.id) AS transaction_count,
    SUM(CASE WHEN t.type = 'purchase' THEN t.amount ELSE 0 END) AS total_purchased,
    SUM(CASE WHEN t.type = 'usage' THEN ABS(t.amount) ELSE 0 END) AS total_used,
    u.created_at,
    u.last_login_at
FROM public.users u
LEFT JOIN public.transactions t ON u.id = t.user_id
GROUP BY u.id;

-- Recent transcriptions view
CREATE OR REPLACE VIEW recent_transcriptions AS
SELECT 
    tr.id,
    tr.user_id,
    u.email,
    u.display_name,
    tr.clip_name,
    tr.duration_seconds,
    tr.word_count,
    tr.credits_used,
    tr.created_at
FROM public.transcriptions tr
JOIN public.users u ON tr.user_id = u.id
ORDER BY tr.created_at DESC
LIMIT 100;

-- ====================================
-- Grants
-- ====================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.transcriptions TO authenticated;
GRANT SELECT ON public.credit_packages TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_credits TO authenticated;
GRANT EXECUTE ON FUNCTION add_credits TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_credits TO authenticated;
GRANT EXECUTE ON FUNCTION log_transcription TO authenticated;

-- ====================================
-- Sample Data (Optional - for testing)
-- ====================================

-- Uncomment to insert sample data
/*
INSERT INTO public.users (id, email, display_name, credits)
VALUES 
    (uuid_generate_v4(), 'demo@reditors.com', 'Demo User', 100);
*/

-- ====================================
-- End of Schema
-- ====================================

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE 'REDitors Voice-to-Text PRO database schema created successfully!';
    RAISE NOTICE 'Tables created: users, transactions, transcriptions, credit_packages';
    RAISE NOTICE 'Views created: user_stats, recent_transcriptions';
    RAISE NOTICE 'Functions created: get_user_credits, add_credits, deduct_credits, log_transcription';
    RAISE NOTICE 'RLS policies enabled for data security';
END $$;
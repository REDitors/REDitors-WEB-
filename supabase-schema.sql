-- ====================================
-- REDitors Pre-Order Database Schema
-- Supabase SQL Setup
-- ====================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== WAITLIST TABLE =====
CREATE TABLE IF NOT EXISTS waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('early-bird', 'founder', 'vip')),
    referral_code TEXT UNIQUE NOT NULL,
    referred_by TEXT REFERENCES waitlist(referral_code),
    referral_count INTEGER DEFAULT 0,
    position INTEGER,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'notified', 'activated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_waitlist_user_id ON waitlist(user_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_referral_code ON waitlist(referral_code);
CREATE INDEX IF NOT EXISTS idx_waitlist_tier ON waitlist(tier);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at);

-- ===== REFERRAL STATS TABLE =====
CREATE TABLE IF NOT EXISTS referral_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL,
    total_referrals INTEGER DEFAULT 0,
    successful_referrals INTEGER DEFAULT 0,
    rank INTEGER,
    rewards_earned TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_stats_user_id ON referral_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_stats_rank ON referral_stats(rank);

-- ===== PREORDER PURCHASES TABLE =====
CREATE TABLE IF NOT EXISTS preorder_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    waitlist_id UUID REFERENCES waitlist(id) ON DELETE CASCADE,
    tier TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method TEXT,
    stripe_payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preorder_user_id ON preorder_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_preorder_status ON preorder_purchases(payment_status);

-- ===== NOTIFICATIONS TABLE =====
CREATE TABLE IF NOT EXISTS waitlist_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    waitlist_id UUID REFERENCES waitlist(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('welcome', 'reminder', 'launch', 'early-access', 'milestone')),
    sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON waitlist_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sent ON waitlist_notifications(sent);

-- ===== FUNCTIONS =====

-- Function to automatically assign position in waitlist
CREATE OR REPLACE FUNCTION assign_waitlist_position()
RETURNS TRIGGER AS $$
BEGIN
    -- Get the next position number
    NEW.position := (
        SELECT COALESCE(MAX(position), 0) + 1
        FROM waitlist
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to assign position
DROP TRIGGER IF EXISTS trigger_assign_position ON waitlist;
CREATE TRIGGER trigger_assign_position
    BEFORE INSERT ON waitlist
    FOR EACH ROW
    EXECUTE FUNCTION assign_waitlist_position();

-- Function to update referral count
CREATE OR REPLACE FUNCTION update_referral_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referred_by IS NOT NULL THEN
        -- Increment referral count for referrer
        UPDATE waitlist
        SET referral_count = referral_count + 1,
            updated_at = NOW()
        WHERE referral_code = NEW.referred_by;
        
        -- Update referral stats
        INSERT INTO referral_stats (user_id, referral_code, total_referrals, successful_referrals)
        SELECT user_id, referral_code, 1, 1
        FROM waitlist
        WHERE referral_code = NEW.referred_by
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            total_referrals = referral_stats.total_referrals + 1,
            successful_referrals = referral_stats.successful_referrals + 1,
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update referral count
DROP TRIGGER IF EXISTS trigger_update_referrals ON waitlist;
CREATE TRIGGER trigger_update_referrals
    AFTER INSERT ON waitlist
    FOR EACH ROW
    EXECUTE FUNCTION update_referral_count();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_waitlist_timestamp ON waitlist;
CREATE TRIGGER update_waitlist_timestamp
    BEFORE UPDATE ON waitlist
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_referral_stats_timestamp ON referral_stats;
CREATE TRIGGER update_referral_stats_timestamp
    BEFORE UPDATE ON referral_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===== VIEWS =====

-- View for waitlist leaderboard
CREATE OR REPLACE VIEW waitlist_leaderboard AS
SELECT 
    w.user_id,
    w.email,
    w.referral_code,
    w.referral_count,
    w.tier,
    w.created_at,
    ROW_NUMBER() OVER (ORDER BY w.referral_count DESC, w.created_at ASC) as rank
FROM waitlist w
WHERE w.referral_count > 0
ORDER BY w.referral_count DESC, w.created_at ASC;

-- View for tier statistics
CREATE OR REPLACE VIEW tier_statistics AS
SELECT 
    tier,
    COUNT(*) as total_signups,
    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_count,
    AVG(referral_count) as avg_referrals,
    MAX(referral_count) as max_referrals
FROM waitlist
GROUP BY tier;

-- ===== ROW LEVEL SECURITY (RLS) =====

-- Enable RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE preorder_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for waitlist table
CREATE POLICY "Users can view their own waitlist entry"
    ON waitlist FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own waitlist entry"
    ON waitlist FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own waitlist entry"
    ON waitlist FOR UPDATE
    USING (auth.uid() = user_id);

-- Policies for referral_stats
CREATE POLICY "Users can view their own referral stats"
    ON referral_stats FOR SELECT
    USING (auth.uid() = user_id);

-- Policies for purchases
CREATE POLICY "Users can view their own purchases"
    ON preorder_purchases FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own purchases"
    ON preorder_purchases FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policies for notifications
CREATE POLICY "Users can view their own notifications"
    ON waitlist_notifications FOR SELECT
    USING (auth.uid() = user_id);

-- ===== SAMPLE DATA (Optional - Remove in Production) =====

-- Uncomment to insert sample data for testing
/*
INSERT INTO waitlist (user_id, email, tier, referral_code, referral_count)
VALUES 
    (uuid_generate_v4(), 'user1@example.com', 'founder', 'REFABC123', 15),
    (uuid_generate_v4(), 'user2@example.com', 'early-bird', 'REFDEF456', 8),
    (uuid_generate_v4(), 'user3@example.com', 'vip', 'REFGHI789', 25);
*/

-- ===== FUNCTIONS FOR FRONTEND =====

-- Function to get user's waitlist position
CREATE OR REPLACE FUNCTION get_waitlist_position(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    user_position INTEGER;
BEGIN
    SELECT position INTO user_position
    FROM waitlist
    WHERE user_id = user_uuid;
    
    RETURN user_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get total waitlist count
CREATE OR REPLACE FUNCTION get_total_waitlist_count()
RETURNS INTEGER AS $$
DECLARE
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count
    FROM waitlist;
    
    RETURN total_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if email is already on waitlist
CREATE OR REPLACE FUNCTION is_email_on_waitlist(check_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    email_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM waitlist WHERE email = check_email
    ) INTO email_exists;
    
    RETURN email_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== COMMENTS =====

COMMENT ON TABLE waitlist IS 'Stores pre-order waitlist entries';
COMMENT ON TABLE referral_stats IS 'Tracks referral statistics for each user';
COMMENT ON TABLE preorder_purchases IS 'Stores pre-order payment information';
COMMENT ON TABLE waitlist_notifications IS 'Manages notifications to waitlist members';

COMMENT ON COLUMN waitlist.tier IS 'Pre-order tier: early-bird, founder, or vip';
COMMENT ON COLUMN waitlist.referral_code IS 'Unique referral code for each user';
COMMENT ON COLUMN waitlist.referred_by IS 'Referral code of the person who referred this user';
COMMENT ON COLUMN waitlist.position IS 'Position in the waitlist queue';

-- ===== GRANT PERMISSIONS =====

-- Grant access to authenticated users
GRANT SELECT, INSERT ON waitlist TO authenticated;
GRANT SELECT ON referral_stats TO authenticated;
GRANT SELECT, INSERT ON preorder_purchases TO authenticated;
GRANT SELECT ON waitlist_notifications TO authenticated;

-- Grant access to views
GRANT SELECT ON waitlist_leaderboard TO authenticated;
GRANT SELECT ON tier_statistics TO authenticated;

-- ===== INDEXES FOR PERFORMANCE =====

-- Additional composite indexes
CREATE INDEX IF NOT EXISTS idx_waitlist_tier_created ON waitlist(tier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_status_tier ON waitlist(status, tier);
CREATE INDEX IF NOT EXISTS idx_waitlist_referrals ON waitlist(referral_count DESC) WHERE referral_count > 0;

-- ====================================
-- END OF SCHEMA
-- ====================================

-- To execute this schema in Supabase:
-- 1. Go to your Supabase project
-- 2. Navigate to SQL Editor
-- 3. Paste this entire script
-- 4. Click "Run"
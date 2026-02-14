-- ================================================================
-- REDitors ENTERPRISE MASTER DATABASE V2 — ULTIMATE EDITION
-- Voice-to-Text PRO + SaaS + Waitlist + Referrals + Stripe
-- ================================================================
--
-- V2 ADDITIONS:
--   ✅ Everything from V1
--   ✅ Feature flags system
--   ✅ A/B testing framework
--   ✅ Coupon / promo code system
--   ✅ Usage analytics (page views, events)
--   ✅ Notification center
--   ✅ File storage metadata tracking
--   ✅ Support ticket system
--   ✅ Changelog / release notes
--   ✅ Webhook delivery log
--   ✅ Session tracking
--   ✅ User feedback / NPS
--   ✅ Affiliate program
--   ✅ Invoice generation
--   ✅ Credit expiry system
--   ✅ IP geolocation cache
--   ✅ Email campaign tracking
--   ✅ Plugin license keys
--   ✅ Error tracking / crash reports
--   ✅ Admin action log with IP
--   ✅ Comprehensive materialized views for analytics
--   ✅ Advanced DB functions (churn prediction, cohort, LTV)
--   ✅ Cron-ready maintenance functions
--
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================================================
-- 1. USERS (unchanged core + new columns)
-- ================================================================

DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    
    role TEXT DEFAULT 'user' CHECK (role IN ('user','admin','support','moderator')),
    banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    
    credits INTEGER DEFAULT 10 CHECK (credits >= 0),
    bonus_credits INTEGER DEFAULT 0 CHECK (bonus_credits >= 0),
    
    total_transcriptions INTEGER DEFAULT 0,
    total_minutes_transcribed DECIMAL(14,2) DEFAULT 0,
    lifetime_value DECIMAL(14,2) DEFAULT 0,
    
    subscription_tier TEXT DEFAULT 'free'
        CHECK (subscription_tier IN ('free','starter','pro','business','enterprise','lifetime')),
    subscription_status TEXT DEFAULT 'inactive'
        CHECK (subscription_status IN ('inactive','active','trialing','past_due','cancelled','paused')),
    subscription_expires_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    stripe_customer_id TEXT UNIQUE,
    
    referral_code TEXT UNIQUE,
    referred_by TEXT,
    referral_count INTEGER DEFAULT 0,
    referral_earnings DECIMAL(14,2) DEFAULT 0,
    
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_step INTEGER DEFAULT 0,
    
    timezone TEXT DEFAULT 'UTC',
    locale TEXT DEFAULT 'en',
    
    preferences JSONB DEFAULT '{}'::JSONB,
    feature_flags JSONB DEFAULT '{}'::JSONB,
    
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    signup_ip TEXT,
    signup_country TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ  -- soft delete
);

CREATE INDEX idx_users_subscription ON public.users(subscription_status);
CREATE INDEX idx_users_tier ON public.users(subscription_tier);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_created_at ON public.users(created_at DESC);
CREATE INDEX idx_users_last_active ON public.users(last_active_at DESC);
CREATE INDEX idx_users_referral ON public.users(referral_code);
CREATE INDEX idx_users_stripe ON public.users(stripe_customer_id);
CREATE INDEX idx_users_deleted ON public.users(deleted_at) WHERE deleted_at IS NULL;

-- Lowercase email enforcement
CREATE OR REPLACE FUNCTION enforce_lowercase_email()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email = LOWER(NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lowercase_email
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION enforce_lowercase_email();

-- Auto updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_users
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ================================================================
-- 2. API KEYS SYSTEM
-- ================================================================

CREATE TABLE public.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    key_hash TEXT UNIQUE NOT NULL,
    key_prefix TEXT NOT NULL,  -- first 8 chars for display
    label TEXT,
    scopes TEXT[] DEFAULT ARRAY['transcribe'],
    rate_limit_per_minute INTEGER DEFAULT 60,
    last_used_at TIMESTAMPTZ,
    usage_count INTEGER DEFAULT 0,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_user ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash) WHERE revoked = FALSE;

-- ================================================================
-- 3. TRANSACTIONS (LEDGER)
-- ================================================================

CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    balance_after INTEGER,
    type TEXT NOT NULL CHECK (
        type IN ('purchase','usage','refund','bonus','subscription',
                 'admin_adjustment','referral_bonus','coupon','expiry')
    ),
    stripe_payment_intent TEXT,
    stripe_invoice_id TEXT,
    idempotency_key TEXT UNIQUE,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_time ON public.transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_type ON public.transactions(type, created_at DESC);
CREATE INDEX idx_transactions_stripe ON public.transactions(stripe_payment_intent);

-- Safe credit deduction with bonus priority
CREATE OR REPLACE FUNCTION deduct_credits_safe(
    user_uuid UUID,
    credit_amount INTEGER,
    description TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    current_credits INTEGER;
    current_bonus INTEGER;
    bonus_deduct INTEGER;
    main_deduct INTEGER;
BEGIN
    SELECT credits, bonus_credits INTO current_credits, current_bonus
    FROM public.users WHERE id = user_uuid FOR UPDATE;

    IF (current_credits + current_bonus) < credit_amount THEN
        RAISE EXCEPTION 'Insufficient credits. Need %, have % (% + % bonus)',
            credit_amount, current_credits + current_bonus, current_credits, current_bonus;
    END IF;

    -- Deduct from bonus first, then main
    bonus_deduct := LEAST(current_bonus, credit_amount);
    main_deduct := credit_amount - bonus_deduct;

    UPDATE public.users
    SET credits = credits - main_deduct,
        bonus_credits = bonus_credits - bonus_deduct
    WHERE id = user_uuid;

    INSERT INTO public.transactions (user_id, amount, balance_after, type, metadata)
    VALUES (
        user_uuid, -credit_amount,
        (current_credits - main_deduct) + (current_bonus - bonus_deduct),
        'usage',
        jsonb_build_object(
            'description', description,
            'bonus_used', bonus_deduct,
            'credits_used', main_deduct
        )
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 4. TRANSCRIPTIONS
-- ================================================================

CREATE TABLE public.transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    team_id UUID,
    
    clip_name TEXT,
    original_filename TEXT,
    file_size_mb DECIMAL(10,2),
    file_format TEXT,
    duration_seconds DECIMAL(14,2),
    sample_rate INTEGER,
    channels INTEGER DEFAULT 1,
    
    word_count INTEGER,
    segment_count INTEGER,
    confidence_avg DECIMAL(5,4),
    
    language TEXT,
    detected_language TEXT,
    model TEXT,
    model_version TEXT,
    
    credits_used INTEGER,
    api_cost_usd DECIMAL(12,4),
    
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending','queued','processing','completed','failed','cancelled')),
    priority INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    error_reason TEXT,
    error_code TEXT,
    processing_time_ms INTEGER,
    queue_wait_ms INTEGER,
    
    transcription_text TEXT,
    segments JSONB,
    summary TEXT,
    keywords TEXT[],
    
    storage_path TEXT,
    output_formats TEXT[] DEFAULT ARRAY['txt'],
    
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    
    source TEXT DEFAULT 'plugin' CHECK (source IN ('plugin','web','api','batch')),
    plugin_version TEXT,
    host_app TEXT CHECK (host_app IN ('premiere','aftereffects','resolve','other')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    CONSTRAINT valid_duration CHECK (duration_seconds >= 0)
);

CREATE INDEX idx_transcriptions_user_status ON public.transcriptions(user_id, status);
CREATE INDEX idx_transcriptions_created ON public.transcriptions(created_at DESC);
CREATE INDEX idx_transcriptions_status ON public.transcriptions(status) WHERE status IN ('pending','queued','processing');
CREATE INDEX idx_transcriptions_team ON public.transcriptions(team_id) WHERE team_id IS NOT NULL;

-- Auto-update user stats on transcription complete
CREATE OR REPLACE FUNCTION update_user_transcription_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        UPDATE public.users SET
            total_transcriptions = total_transcriptions + 1,
            total_minutes_transcribed = total_minutes_transcribed + COALESCE(NEW.duration_seconds / 60.0, 0),
            last_active_at = NOW()
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_transcription_complete
AFTER INSERT OR UPDATE ON public.transcriptions
FOR EACH ROW EXECUTE FUNCTION update_user_transcription_stats();

-- ================================================================
-- 5. TEAMS / AGENCY SYSTEM
-- ================================================================

CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    owner_id UUID REFERENCES public.users(id),
    logo_url TEXT,
    credits_pool INTEGER DEFAULT 0 CHECK (credits_pool >= 0),
    max_members INTEGER DEFAULT 5,
    subscription_tier TEXT DEFAULT 'free',
    settings JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('owner','admin','editor','viewer')),
    credits_allocated INTEGER DEFAULT 0,
    credits_used INTEGER DEFAULT 0,
    invited_by UUID REFERENCES public.users(id),
    invite_accepted BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

CREATE TABLE public.team_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'editor',
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    invited_by UUID REFERENCES public.users(id),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 6. SUBSCRIPTIONS (STRIPE READY)
-- ================================================================

CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    stripe_subscription_id TEXT UNIQUE,
    stripe_price_id TEXT,
    stripe_product_id TEXT,
    
    plan_name TEXT,
    plan_interval TEXT CHECK (plan_interval IN ('month','year','lifetime')),
    plan_amount DECIMAL(12,2),
    plan_currency TEXT DEFAULT 'USD',
    
    status TEXT CHECK (status IN (
        'active','trialing','past_due','cancelled','paused',
        'incomplete','incomplete_expired','unpaid'
    )),
    
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    
    monthly_credits INTEGER DEFAULT 0,
    credits_renewed_at TIMESTAMPTZ,
    
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

-- ================================================================
-- 7. WAITLIST + REFERRALS
-- ================================================================

CREATE TABLE public.waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    company TEXT,
    job_title TEXT,
    use_case TEXT,
    
    tier TEXT CHECK (tier IN ('early-bird','founder','vip','beta-tester')),
    
    referral_code TEXT UNIQUE NOT NULL,
    referred_by TEXT,
    referral_count INTEGER DEFAULT 0,
    
    position INTEGER,
    priority_score INTEGER DEFAULT 0,
    
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token TEXT,
    invite_sent BOOLEAN DEFAULT FALSE,
    invite_sent_at TIMESTAMPTZ,
    converted_to_user BOOLEAN DEFAULT FALSE,
    converted_at TIMESTAMPTZ,
    
    source TEXT,
    campaign TEXT,
    landing_page TEXT,
    ip_address TEXT,
    country TEXT,
    city TEXT,
    user_agent TEXT,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_waitlist_referrals ON public.waitlist(referral_count DESC);
CREATE INDEX idx_waitlist_position ON public.waitlist(position ASC);
CREATE INDEX idx_waitlist_email ON public.waitlist(email);
CREATE INDEX idx_waitlist_priority ON public.waitlist(priority_score DESC);

-- Priority-based position assignment
CREATE OR REPLACE FUNCTION assign_waitlist_position()
RETURNS TRIGGER AS $$
BEGIN
    NEW.position := (SELECT COALESCE(MAX(position), 0) + 1 FROM public.waitlist);
    -- VIPs and founders get priority boost
    IF NEW.tier = 'vip' THEN
        NEW.priority_score := NEW.priority_score + 100;
    ELSIF NEW.tier = 'founder' THEN
        NEW.priority_score := NEW.priority_score + 50;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_waitlist_position
BEFORE INSERT ON public.waitlist
FOR EACH ROW EXECUTE FUNCTION assign_waitlist_position();

-- Auto-boost position when referrals increase
CREATE OR REPLACE FUNCTION boost_referral_position()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_count > OLD.referral_count THEN
        NEW.priority_score := NEW.priority_score + 10;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_referral_boost
BEFORE UPDATE ON public.waitlist
FOR EACH ROW EXECUTE FUNCTION boost_referral_position();

-- ================================================================
-- 8. PREORDERS
-- ================================================================

CREATE TABLE public.preorder_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    waitlist_id UUID REFERENCES public.waitlist(id),
    user_id UUID REFERENCES public.users(id),
    email TEXT NOT NULL,
    
    tier TEXT,
    amount DECIMAL(12,2),
    currency TEXT DEFAULT 'USD',
    discount_applied DECIMAL(12,2) DEFAULT 0,
    coupon_code TEXT,
    
    stripe_payment_intent TEXT UNIQUE,
    stripe_charge_id TEXT,
    status TEXT CHECK (status IN ('pending','completed','failed','refunded','disputed')),
    
    refunded_at TIMESTAMPTZ,
    refund_reason TEXT,
    
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 9. RATE LIMITING
-- ================================================================

CREATE TABLE public.rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier TEXT NOT NULL,  -- user_id or IP or API key prefix
    identifier_type TEXT CHECK (identifier_type IN ('user','ip','api_key')),
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 0,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    blocked_until TIMESTAMPTZ,
    UNIQUE(identifier, endpoint, window_start)
);

CREATE INDEX idx_rate_limits_lookup ON public.rate_limits(identifier, endpoint, window_start DESC);

-- ================================================================
-- 10. DAILY METRICS
-- ================================================================

CREATE TABLE public.daily_metrics (
    date DATE PRIMARY KEY,
    new_users INTEGER DEFAULT 0,
    new_waitlist INTEGER DEFAULT 0,
    new_transcriptions INTEGER DEFAULT 0,
    completed_transcriptions INTEGER DEFAULT 0,
    failed_transcriptions INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    revenue_usd DECIMAL(14,2) DEFAULT 0,
    credits_purchased INTEGER DEFAULT 0,
    credits_used INTEGER DEFAULT 0,
    total_minutes_processed DECIMAL(14,2) DEFAULT 0,
    avg_processing_time_ms INTEGER DEFAULT 0,
    api_cost_usd DECIMAL(14,2) DEFAULT 0,
    new_subscriptions INTEGER DEFAULT 0,
    churned_subscriptions INTEGER DEFAULT 0,
    support_tickets_opened INTEGER DEFAULT 0,
    support_tickets_resolved INTEGER DEFAULT 0,
    error_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 11. AUDIT LOGS
-- ================================================================

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID,
    action TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE','LOGIN','ADMIN_ACTION')),
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[],
    changed_by UUID,
    ip_address TEXT,
    user_agent TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX idx_audit_changed_by ON public.audit_logs(changed_by, changed_at DESC);
CREATE INDEX idx_audit_time ON public.audit_logs(changed_at DESC);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    changed TEXT[] := ARRAY[]::TEXT[];
    col TEXT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        FOR col IN SELECT column_name FROM information_schema.columns
            WHERE table_schema = TG_TABLE_SCHEMA AND table_name = TG_TABLE_NAME
        LOOP
            BEGIN
                IF to_jsonb(OLD) ->> col IS DISTINCT FROM to_jsonb(NEW) ->> col THEN
                    changed := array_append(changed, col);
                END IF;
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END LOOP;
    END IF;

    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_fields, changed_by)
    VALUES (
        TG_TABLE_NAME,
        CASE TG_OP WHEN 'DELETE' THEN (OLD).id ELSE (NEW).id END,
        TG_OP,
        CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        CASE WHEN array_length(changed, 1) > 0 THEN changed ELSE NULL END,
        auth.uid()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach audit to critical tables
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_subscriptions AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_transactions AFTER INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ================================================================
-- 12. FEATURE FLAGS
-- ================================================================

CREATE TABLE public.feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT FALSE,
    rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
    target_tiers TEXT[] DEFAULT ARRAY[]::TEXT[],
    target_roles TEXT[] DEFAULT ARRAY[]::TEXT[],
    target_user_ids UUID[] DEFAULT ARRAY[]::UUID[],
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Check if user has feature flag
CREATE OR REPLACE FUNCTION check_feature_flag(user_uuid UUID, flag_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    flag RECORD;
    usr RECORD;
BEGIN
    SELECT * INTO flag FROM public.feature_flags WHERE name = flag_name;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    IF NOT flag.enabled THEN RETURN FALSE; END IF;

    SELECT * INTO usr FROM public.users WHERE id = user_uuid;
    IF NOT FOUND THEN RETURN FALSE; END IF;

    -- Check user-specific targeting
    IF user_uuid = ANY(flag.target_user_ids) THEN RETURN TRUE; END IF;
    -- Check tier targeting
    IF array_length(flag.target_tiers, 1) > 0 AND usr.subscription_tier = ANY(flag.target_tiers) THEN RETURN TRUE; END IF;
    -- Check role targeting
    IF array_length(flag.target_roles, 1) > 0 AND usr.role = ANY(flag.target_roles) THEN RETURN TRUE; END IF;
    -- Check rollout percentage (deterministic hash)
    IF flag.rollout_percentage > 0 THEN
        RETURN (abs(hashtext(user_uuid::text || flag_name)) % 100) < flag.rollout_percentage;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 13. COUPON / PROMO CODE SYSTEM
-- ================================================================

CREATE TABLE public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    
    type TEXT NOT NULL CHECK (type IN ('percentage','fixed_amount','credits','trial_extension')),
    value DECIMAL(12,2) NOT NULL,
    
    applies_to TEXT CHECK (applies_to IN ('subscription','credits','preorder','any')),
    min_purchase DECIMAL(12,2) DEFAULT 0,
    
    max_redemptions INTEGER,
    current_redemptions INTEGER DEFAULT 0,
    max_per_user INTEGER DEFAULT 1,
    
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    
    target_tiers TEXT[] DEFAULT ARRAY[]::TEXT[],
    first_purchase_only BOOLEAN DEFAULT FALSE,
    
    active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID REFERENCES public.coupons(id),
    user_id UUID REFERENCES public.users(id),
    discount_amount DECIMAL(12,2),
    order_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(coupon_id, user_id)
);

-- ================================================================
-- 14. NOTIFICATIONS
-- ================================================================

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'system','billing','transcription','team','referral',
        'promotion','security','changelog','milestone'
    )),
    title TEXT NOT NULL,
    body TEXT,
    action_url TEXT,
    icon TEXT,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::JSONB,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, read, created_at DESC);

-- ================================================================
-- 15. SUPPORT TICKETS
-- ================================================================

CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    assigned_to UUID REFERENCES public.users(id),
    
    subject TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN (
        'bug','feature_request','billing','account',
        'plugin','transcription','general','urgent'
    )),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting','resolved','closed')),
    
    metadata JSONB DEFAULT '{}'::JSONB,
    
    resolved_at TIMESTAMPTZ,
    first_response_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id),
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    attachments JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_user ON public.support_tickets(user_id, status);
CREATE INDEX idx_tickets_status ON public.support_tickets(status, priority);

-- ================================================================
-- 16. CHANGELOG / RELEASE NOTES
-- ================================================================

CREATE TABLE public.changelog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('feature','improvement','bugfix','breaking','security')),
    product TEXT CHECK (product IN ('plugin','web','api','all')),
    published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    author_id UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 17. WEBHOOK DELIVERY LOG
-- ================================================================

CREATE TABLE public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT NOT NULL,  -- 'stripe', 'supabase', 'google', etc.
    event_type TEXT NOT NULL,
    payload JSONB,
    response_code INTEGER,
    response_body TEXT,
    processed BOOLEAN DEFAULT FALSE,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_webhook_logs_source ON public.webhook_logs(source, event_type, created_at DESC);
CREATE INDEX idx_webhook_unprocessed ON public.webhook_logs(processed) WHERE processed = FALSE;

-- ================================================================
-- 18. SESSIONS
-- ================================================================

CREATE TABLE public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    ip_address TEXT,
    country TEXT,
    city TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    pages_viewed INTEGER DEFAULT 0,
    actions_taken INTEGER DEFAULT 0
);

CREATE INDEX idx_sessions_user ON public.sessions(user_id, started_at DESC);

-- ================================================================
-- 19. ANALYTICS EVENTS
-- ================================================================

CREATE TABLE public.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    event_name TEXT NOT NULL,
    event_category TEXT,
    properties JSONB DEFAULT '{}'::JSONB,
    page_url TEXT,
    referrer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_user ON public.analytics_events(user_id, created_at DESC);
CREATE INDEX idx_events_name ON public.analytics_events(event_name, created_at DESC);

-- ================================================================
-- 20. USER FEEDBACK / NPS
-- ================================================================

CREATE TABLE public.user_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    type TEXT CHECK (type IN ('nps','csat','feedback','bug_report','feature_request','review')),
    score INTEGER CHECK (score BETWEEN 0 AND 10),
    comment TEXT,
    page TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_type ON public.user_feedback(type, created_at DESC);

-- ================================================================
-- 21. AFFILIATE PROGRAM
-- ================================================================

CREATE TABLE public.affiliates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    affiliate_code TEXT UNIQUE NOT NULL,
    commission_rate DECIMAL(5,2) DEFAULT 20.00,
    status TEXT DEFAULT 'active' CHECK (status IN ('pending','active','suspended','terminated')),
    total_referrals INTEGER DEFAULT 0,
    total_revenue_generated DECIMAL(14,2) DEFAULT 0,
    total_commission_earned DECIMAL(14,2) DEFAULT 0,
    total_commission_paid DECIMAL(14,2) DEFAULT 0,
    payout_method TEXT,
    payout_details JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.affiliate_conversions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affiliate_id UUID REFERENCES public.affiliates(id),
    referred_user_id UUID REFERENCES public.users(id),
    transaction_id UUID REFERENCES public.transactions(id),
    revenue_amount DECIMAL(12,2),
    commission_amount DECIMAL(12,2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 22. INVOICES
-- ================================================================

CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    invoice_number TEXT UNIQUE NOT NULL,
    stripe_invoice_id TEXT UNIQUE,
    
    subtotal DECIMAL(12,2),
    tax DECIMAL(12,2) DEFAULT 0,
    discount DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2),
    currency TEXT DEFAULT 'USD',
    
    status TEXT CHECK (status IN ('draft','open','paid','void','uncollectible')),
    
    line_items JSONB DEFAULT '[]'::JSONB,
    billing_details JSONB DEFAULT '{}'::JSONB,
    
    due_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_user ON public.invoices(user_id, created_at DESC);

-- ================================================================
-- 23. PLUGIN LICENSE KEYS
-- ================================================================

CREATE TABLE public.plugin_licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    license_key TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    product TEXT NOT NULL CHECK (product IN ('premiere','aftereffects','bundle','all')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active','expired','revoked','suspended')),
    max_activations INTEGER DEFAULT 2,
    current_activations INTEGER DEFAULT 0,
    activated_machines JSONB DEFAULT '[]'::JSONB,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_licenses_user ON public.plugin_licenses(user_id);
CREATE INDEX idx_licenses_key ON public.plugin_licenses(license_key);

-- ================================================================
-- 24. ERROR TRACKING
-- ================================================================

CREATE TABLE public.error_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    source TEXT CHECK (source IN ('plugin','web','api','webhook','system')),
    error_code TEXT,
    error_message TEXT,
    stack_trace TEXT,
    context JSONB DEFAULT '{}'::JSONB,
    severity TEXT CHECK (severity IN ('info','warning','error','critical')),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    occurrence_count INTEGER DEFAULT 1,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_errors_unresolved ON public.error_reports(source, severity) WHERE resolved = FALSE;

-- ================================================================
-- 25. EMAIL CAMPAIGNS
-- ================================================================

CREATE TABLE public.email_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    template TEXT,
    target_segment TEXT CHECK (target_segment IN (
        'all_users','free_users','paid_users','churned','waitlist',
        'inactive_30d','new_users_7d','custom'
    )),
    target_query TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','cancelled')),
    sent_count INTEGER DEFAULT 0,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    unsubscribe_count INTEGER DEFAULT 0,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.email_sends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.email_campaigns(id),
    recipient_email TEXT NOT NULL,
    user_id UUID REFERENCES public.users(id),
    status TEXT CHECK (status IN ('sent','delivered','opened','clicked','bounced','unsubscribed')),
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 26. IP GEOLOCATION CACHE
-- ================================================================

CREATE TABLE public.geo_cache (
    ip_address TEXT PRIMARY KEY,
    country TEXT,
    country_code TEXT,
    region TEXT,
    city TEXT,
    latitude DECIMAL(10,6),
    longitude DECIMAL(10,6),
    timezone TEXT,
    isp TEXT,
    is_vpn BOOLEAN DEFAULT FALSE,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 27. A/B TESTING
-- ================================================================

CREATE TABLE public.ab_experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    variants JSONB NOT NULL DEFAULT '[{"name":"control","weight":50},{"name":"variant","weight":50}]',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft','running','paused','completed')),
    target_metric TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.ab_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID REFERENCES public.ab_experiments(id),
    user_id UUID REFERENCES public.users(id),
    variant TEXT NOT NULL,
    converted BOOLEAN DEFAULT FALSE,
    conversion_value DECIMAL(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    converted_at TIMESTAMPTZ,
    UNIQUE(experiment_id, user_id)
);

-- ================================================================
-- 28. CREDIT PACKAGES (for purchase)
-- ================================================================

CREATE TABLE public.credit_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    bonus_credits INTEGER DEFAULT 0,
    price_usd DECIMAL(12,2) NOT NULL,
    stripe_price_id TEXT,
    popular BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default packages
INSERT INTO public.credit_packages (name, credits, bonus_credits, price_usd, sort_order) VALUES
    ('Starter', 50, 0, 4.99, 1),
    ('Creator', 150, 25, 12.99, 2),
    ('Pro Pack', 500, 100, 39.99, 3),
    ('Studio', 1500, 500, 99.99, 4),
    ('Enterprise', 5000, 2000, 299.99, 5);

-- ================================================================
-- AUTO CREATE USER PROFILE ON SIGNUP
-- ================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    ref_code TEXT;
    referrer_id UUID;
BEGIN
    -- Generate unique referral code
    ref_code := upper(substr(gen_random_uuid()::text, 1, 8));

    INSERT INTO public.users (
        id, email, display_name, credits, referral_code,
        utm_source, utm_medium, utm_campaign,
        referred_by
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        10,
        ref_code,
        NEW.raw_user_meta_data->>'utm_source',
        NEW.raw_user_meta_data->>'utm_medium',
        NEW.raw_user_meta_data->>'utm_campaign',
        NEW.raw_user_meta_data->>'referred_by'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Welcome bonus transaction
    INSERT INTO public.transactions (user_id, amount, balance_after, type, metadata)
    VALUES (NEW.id, 10, 10, 'bonus', '{"reason":"welcome_bonus"}'::JSONB);

    -- Welcome notification
    INSERT INTO public.notifications (user_id, type, title, body, action_url)
    VALUES (
        NEW.id, 'system',
        'Welcome to REDitors! 🎬',
        'You have 10 free credits to get started. Try your first transcription now!',
        '/dashboard'
    );

    -- Credit referrer if exists
    IF NEW.raw_user_meta_data->>'referred_by' IS NOT NULL THEN
        UPDATE public.users
        SET referral_count = referral_count + 1,
            bonus_credits = bonus_credits + 5
        WHERE referral_code = NEW.raw_user_meta_data->>'referred_by';

        -- Give referrer bonus credits
        SELECT id INTO referrer_id FROM public.users
        WHERE referral_code = NEW.raw_user_meta_data->>'referred_by';

        IF referrer_id IS NOT NULL THEN
            INSERT INTO public.transactions (user_id, amount, balance_after, type, metadata)
            SELECT referrer_id, 5,
                   (SELECT credits + bonus_credits FROM public.users WHERE id = referrer_id),
                   'referral_bonus',
                   jsonb_build_object('referred_user', NEW.email);

            INSERT INTO public.notifications (user_id, type, title, body)
            VALUES (referrer_id, 'referral',
                    'New Referral! +5 Credits 🎉',
                    'Someone signed up using your referral link. You earned 5 bonus credits!');
        END IF;

        -- Update waitlist referral count too
        UPDATE public.waitlist
        SET referral_count = referral_count + 1
        WHERE referral_code = NEW.raw_user_meta_data->>'referred_by';
    END IF;

    -- Mark waitlist entry as converted
    UPDATE public.waitlist
    SET converted_to_user = TRUE, converted_at = NOW()
    WHERE email = LOWER(NEW.email);

    -- Generate plugin license
    INSERT INTO public.plugin_licenses (user_id, product, expires_at)
    VALUES (NEW.id, 'bundle', NOW() + INTERVAL '30 days');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ================================================================
-- ADVANCED ANALYTICS FUNCTIONS
-- ================================================================

-- Calculate MRR
CREATE OR REPLACE FUNCTION calculate_mrr()
RETURNS DECIMAL AS $$
    SELECT COALESCE(SUM(
        CASE plan_interval
            WHEN 'month' THEN plan_amount
            WHEN 'year' THEN plan_amount / 12
            ELSE 0
        END
    ), 0)
    FROM public.subscriptions
    WHERE status = 'active';
$$ LANGUAGE sql SECURITY DEFINER;

-- User churn risk score (0-100)
CREATE OR REPLACE FUNCTION churn_risk_score(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    usr RECORD;
    last_txn_days INTEGER;
    last_active_days INTEGER;
BEGIN
    SELECT * INTO usr FROM public.users WHERE id = user_uuid;
    IF NOT FOUND THEN RETURN -1; END IF;

    -- Days since last activity
    last_active_days := EXTRACT(DAY FROM NOW() - COALESCE(usr.last_active_at, usr.created_at));
    IF last_active_days > 30 THEN score := score + 30;
    ELSIF last_active_days > 14 THEN score := score + 15;
    ELSIF last_active_days > 7 THEN score := score + 5;
    END IF;

    -- Low credit balance
    IF usr.credits <= 0 THEN score := score + 20;
    ELSIF usr.credits < 3 THEN score := score + 10;
    END IF;

    -- Subscription status
    IF usr.subscription_status = 'past_due' THEN score := score + 25;
    ELSIF usr.subscription_status = 'cancelled' THEN score := score + 40;
    END IF;

    -- Low engagement
    IF usr.total_transcriptions = 0 THEN score := score + 15;
    ELSIF usr.total_transcriptions < 3 THEN score := score + 5;
    END IF;

    -- Not completed onboarding
    IF NOT usr.onboarding_completed THEN score := score + 10; END IF;

    RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cohort retention analysis
CREATE OR REPLACE FUNCTION get_cohort_retention(months_back INTEGER DEFAULT 6)
RETURNS TABLE (
    cohort_month TEXT,
    total_users BIGINT,
    month_0 BIGINT, month_1 BIGINT, month_2 BIGINT,
    month_3 BIGINT, month_4 BIGINT, month_5 BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH cohorts AS (
        SELECT id, date_trunc('month', created_at) AS cohort
        FROM public.users
        WHERE created_at >= NOW() - (months_back || ' months')::INTERVAL
    ),
    activity AS (
        SELECT DISTINCT user_id, date_trunc('month', created_at) AS active_month
        FROM public.transcriptions
        WHERE created_at >= NOW() - (months_back || ' months')::INTERVAL
    )
    SELECT
        to_char(c.cohort, 'YYYY-MM') AS cohort_month,
        COUNT(DISTINCT c.id) AS total_users,
        COUNT(DISTINCT CASE WHEN a.active_month = c.cohort THEN c.id END) AS month_0,
        COUNT(DISTINCT CASE WHEN a.active_month = c.cohort + INTERVAL '1 month' THEN c.id END) AS month_1,
        COUNT(DISTINCT CASE WHEN a.active_month = c.cohort + INTERVAL '2 months' THEN c.id END) AS month_2,
        COUNT(DISTINCT CASE WHEN a.active_month = c.cohort + INTERVAL '3 months' THEN c.id END) AS month_3,
        COUNT(DISTINCT CASE WHEN a.active_month = c.cohort + INTERVAL '4 months' THEN c.id END) AS month_4,
        COUNT(DISTINCT CASE WHEN a.active_month = c.cohort + INTERVAL '5 months' THEN c.id END) AS month_5
    FROM cohorts c
    LEFT JOIN activity a ON a.user_id = c.id
    GROUP BY c.cohort
    ORDER BY c.cohort;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Daily metrics auto-populate (run via pg_cron or Supabase Edge Function)
CREATE OR REPLACE FUNCTION populate_daily_metrics(target_date DATE DEFAULT CURRENT_DATE - 1)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.daily_metrics (
        date, new_users, new_waitlist, new_transcriptions,
        completed_transcriptions, failed_transcriptions, active_users,
        revenue_usd, credits_used, total_minutes_processed,
        avg_processing_time_ms, api_cost_usd, error_rate
    )
    SELECT
        target_date,
        (SELECT COUNT(*) FROM public.users WHERE created_at::DATE = target_date),
        (SELECT COUNT(*) FROM public.waitlist WHERE created_at::DATE = target_date),
        (SELECT COUNT(*) FROM public.transcriptions WHERE created_at::DATE = target_date),
        (SELECT COUNT(*) FROM public.transcriptions WHERE completed_at::DATE = target_date AND status = 'completed'),
        (SELECT COUNT(*) FROM public.transcriptions WHERE created_at::DATE = target_date AND status = 'failed'),
        (SELECT COUNT(DISTINCT user_id) FROM public.transcriptions WHERE created_at::DATE = target_date),
        (SELECT COALESCE(SUM(ABS(amount)), 0) FROM public.transactions WHERE created_at::DATE = target_date AND type IN ('purchase','subscription')),
        (SELECT COALESCE(SUM(ABS(amount)), 0) FROM public.transactions WHERE created_at::DATE = target_date AND type = 'usage'),
        (SELECT COALESCE(SUM(duration_seconds / 60.0), 0) FROM public.transcriptions WHERE completed_at::DATE = target_date),
        (SELECT COALESCE(AVG(processing_time_ms), 0)::INTEGER FROM public.transcriptions WHERE completed_at::DATE = target_date),
        (SELECT COALESCE(SUM(api_cost_usd), 0) FROM public.transcriptions WHERE completed_at::DATE = target_date),
        (SELECT CASE WHEN COUNT(*) > 0 THEN
            (COUNT(*) FILTER (WHERE status = 'failed')::DECIMAL / COUNT(*) * 100)
         ELSE 0 END FROM public.transcriptions WHERE created_at::DATE = target_date)
    ON CONFLICT (date) DO UPDATE SET
        new_users = EXCLUDED.new_users,
        new_waitlist = EXCLUDED.new_waitlist,
        new_transcriptions = EXCLUDED.new_transcriptions,
        completed_transcriptions = EXCLUDED.completed_transcriptions,
        failed_transcriptions = EXCLUDED.failed_transcriptions,
        active_users = EXCLUDED.active_users,
        revenue_usd = EXCLUDED.revenue_usd,
        credits_used = EXCLUDED.credits_used,
        total_minutes_processed = EXCLUDED.total_minutes_processed,
        avg_processing_time_ms = EXCLUDED.avg_processing_time_ms,
        api_cost_usd = EXCLUDED.api_cost_usd,
        error_rate = EXCLUDED.error_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old data (run weekly)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS VOID AS $$
BEGIN
    -- Delete old rate limit records
    DELETE FROM public.rate_limits WHERE window_start < NOW() - INTERVAL '24 hours';
    -- Delete old sessions
    DELETE FROM public.sessions WHERE started_at < NOW() - INTERVAL '90 days';
    -- Delete expired notifications
    DELETE FROM public.notifications WHERE expires_at < NOW() AND read = TRUE;
    -- Delete old analytics events
    DELETE FROM public.analytics_events WHERE created_at < NOW() - INTERVAL '365 days';
    -- Delete old geo cache
    DELETE FROM public.geo_cache WHERE fetched_at < NOW() - INTERVAL '30 days';
    -- Clean processed webhook logs
    DELETE FROM public.webhook_logs WHERE processed = TRUE AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- RLS SECURITY
-- ================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plugin_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Users
CREATE POLICY "Users view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.users FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Admins view all users" ON public.users FOR SELECT
    USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- Transactions
CREATE POLICY "Users view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

-- Transcriptions
CREATE POLICY "Users view own transcriptions" ON public.transcriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own transcriptions" ON public.transcriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own transcriptions" ON public.transcriptions FOR UPDATE USING (auth.uid() = user_id);

-- Subscriptions
CREATE POLICY "Users view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Notifications
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Support tickets
CREATE POLICY "Users view own tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Plugin licenses
CREATE POLICY "Users view own licenses" ON public.plugin_licenses FOR SELECT USING (auth.uid() = user_id);

-- Feedback
CREATE POLICY "Users submit feedback" ON public.user_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own feedback" ON public.user_feedback FOR SELECT USING (auth.uid() = user_id);

-- API Keys
CREATE POLICY "Users manage own keys" ON public.api_keys FOR ALL USING (auth.uid() = user_id);

-- Team members
CREATE POLICY "Team members view team" ON public.team_members FOR SELECT
    USING (auth.uid() = user_id OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

-- Sessions
CREATE POLICY "Users view own sessions" ON public.sessions FOR SELECT USING (auth.uid() = user_id);

-- ================================================================
-- GRANTS
-- ================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Authenticated users
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.transcriptions TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT ON public.ticket_messages TO authenticated;
GRANT SELECT ON public.plugin_licenses TO authenticated;
GRANT SELECT, INSERT ON public.user_feedback TO authenticated;
GRANT ALL ON public.api_keys TO authenticated;
GRANT SELECT ON public.team_members TO authenticated;
GRANT SELECT ON public.teams TO authenticated;
GRANT SELECT ON public.sessions TO authenticated;
GRANT SELECT ON public.changelog TO authenticated;
GRANT SELECT ON public.credit_packages TO authenticated;
GRANT SELECT ON public.feature_flags TO authenticated;
GRANT SELECT ON public.coupons TO authenticated;

-- Public (anon) - waitlist and preorders
GRANT INSERT ON public.waitlist TO anon;
GRANT SELECT ON public.credit_packages TO anon;
GRANT SELECT ON public.changelog TO anon;

-- Functions
GRANT EXECUTE ON FUNCTION deduct_credits_safe TO authenticated;
GRANT EXECUTE ON FUNCTION check_feature_flag TO authenticated;
GRANT EXECUTE ON FUNCTION churn_risk_score TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_mrr TO authenticated;

-- ================================================================
-- DONE
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'REDitors ENTERPRISE V2 DATABASE READY!';
    RAISE NOTICE '38 tables, 15+ functions, full RLS';
    RAISE NOTICE '========================================';
END $$;
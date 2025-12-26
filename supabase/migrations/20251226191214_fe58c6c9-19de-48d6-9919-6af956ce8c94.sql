-- Create table for user friendships
CREATE TABLE public.user_friends (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    friend_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, friend_id)
);

-- Create table for companies/organizations
CREATE TABLE public.companies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    total_carbon_saved NUMERIC DEFAULT 0,
    member_count INTEGER DEFAULT 0
);

-- Create table for user company memberships
CREATE TABLE public.user_companies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, company_id)
);

-- Create table for Plaid linked accounts
CREATE TABLE public.plaid_accounts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    access_token TEXT NOT NULL,
    item_id TEXT NOT NULL,
    institution_name TEXT,
    account_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Create table for imported transactions
CREATE TABLE public.imported_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    plaid_account_id UUID REFERENCES public.plaid_accounts(id) ON DELETE CASCADE,
    transaction_id TEXT NOT NULL UNIQUE,
    merchant_name TEXT,
    category TEXT,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    carbon_impact NUMERIC,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create view for city leaderboard
CREATE OR REPLACE VIEW public.city_leaderboard AS
SELECT 
    p.city,
    COUNT(DISTINCT p.user_id) as member_count,
    COALESCE(SUM(p.total_carbon_saved), 0) as total_carbon_saved,
    COALESCE(AVG(p.total_carbon_saved), 0) as avg_carbon_saved
FROM public.profiles p
WHERE p.city IS NOT NULL AND p.city != ''
GROUP BY p.city
ORDER BY total_carbon_saved DESC;

-- Create view for company leaderboard
CREATE OR REPLACE VIEW public.company_leaderboard AS
SELECT 
    c.id,
    c.name,
    c.logo_url,
    COUNT(DISTINCT uc.user_id) as member_count,
    COALESCE(SUM(p.total_carbon_saved), 0) as total_carbon_saved,
    COALESCE(AVG(p.total_carbon_saved), 0) as avg_carbon_saved
FROM public.companies c
LEFT JOIN public.user_companies uc ON c.id = uc.company_id
LEFT JOIN public.profiles p ON uc.user_id = p.user_id
GROUP BY c.id, c.name, c.logo_url
ORDER BY total_carbon_saved DESC;

-- Create view for friends leaderboard
CREATE OR REPLACE VIEW public.friends_leaderboard AS
SELECT 
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.city,
    p.total_carbon_saved,
    p.current_streak,
    p.level
FROM public.profiles p;

-- Enable RLS on all tables
ALTER TABLE public.user_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imported_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_friends
CREATE POLICY "Users can view their own friendships"
ON public.user_friends FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friend requests"
ON public.user_friends FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their friend requests"
ON public.user_friends FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete their friendships"
ON public.user_friends FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- RLS policies for companies
CREATE POLICY "Companies are viewable by everyone"
ON public.companies FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create companies"
ON public.companies FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS policies for user_companies
CREATE POLICY "User company memberships viewable by everyone"
ON public.user_companies FOR SELECT
USING (true);

CREATE POLICY "Users can join companies"
ON public.user_companies FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave companies"
ON public.user_companies FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for plaid_accounts
CREATE POLICY "Users can view own Plaid accounts"
ON public.plaid_accounts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own Plaid accounts"
ON public.plaid_accounts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Plaid accounts"
ON public.plaid_accounts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own Plaid accounts"
ON public.plaid_accounts FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for imported_transactions
CREATE POLICY "Users can view own transactions"
ON public.imported_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions"
ON public.imported_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
ON public.imported_transactions FOR UPDATE
USING (auth.uid() = user_id);
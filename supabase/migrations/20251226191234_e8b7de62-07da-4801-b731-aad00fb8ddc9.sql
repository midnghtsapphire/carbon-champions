-- Fix Security Definer Views by setting security_invoker = true

-- Drop and recreate city_leaderboard with security invoker
DROP VIEW IF EXISTS public.city_leaderboard;
CREATE VIEW public.city_leaderboard WITH (security_invoker = true) AS
SELECT 
    p.city,
    COUNT(DISTINCT p.user_id) as member_count,
    COALESCE(SUM(p.total_carbon_saved), 0) as total_carbon_saved,
    COALESCE(AVG(p.total_carbon_saved), 0) as avg_carbon_saved
FROM public.profiles p
WHERE p.city IS NOT NULL AND p.city != ''
GROUP BY p.city
ORDER BY total_carbon_saved DESC;

-- Drop and recreate company_leaderboard with security invoker
DROP VIEW IF EXISTS public.company_leaderboard;
CREATE VIEW public.company_leaderboard WITH (security_invoker = true) AS
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

-- Drop and recreate friends_leaderboard with security invoker
DROP VIEW IF EXISTS public.friends_leaderboard;
CREATE VIEW public.friends_leaderboard WITH (security_invoker = true) AS
SELECT 
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.city,
    p.total_carbon_saved,
    p.current_streak,
    p.level
FROM public.profiles p;

-- Drop and recreate weekly_leaderboard with security invoker (existing view)
DROP VIEW IF EXISTS public.weekly_leaderboard;
CREATE VIEW public.weekly_leaderboard WITH (security_invoker = true) AS
SELECT 
    p.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.city,
    p.current_streak,
    COALESCE(SUM(
        CASE WHEN ce.is_reduction = true THEN ce.carbon_amount ELSE 0 END
    ), 0) as weekly_reduction
FROM public.profiles p
LEFT JOIN public.carbon_entries ce ON p.user_id = ce.user_id 
    AND ce.entry_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY p.user_id, p.username, p.display_name, p.avatar_url, p.city, p.current_streak;
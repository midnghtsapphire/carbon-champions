
-- Drop the SECURITY DEFINER view and recreate as regular view
DROP VIEW IF EXISTS public.weekly_leaderboard;

-- Recreate as a regular view (RLS on underlying tables will apply)
CREATE VIEW public.weekly_leaderboard AS
SELECT 
    p.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.city,
    p.current_streak,
    COALESCE(SUM(ce.carbon_amount) FILTER (WHERE ce.is_reduction = true), 0) as weekly_reduction
FROM public.profiles p
LEFT JOIN public.carbon_entries ce ON p.user_id = ce.user_id 
    AND ce.entry_date >= date_trunc('week', CURRENT_DATE)
    AND ce.entry_date < date_trunc('week', CURRENT_DATE) + interval '1 week'
GROUP BY p.user_id, p.username, p.display_name, p.avatar_url, p.city, p.current_streak
ORDER BY weekly_reduction DESC;

-- Add policy to allow viewing other users' carbon entries for leaderboard aggregation
CREATE POLICY "Users can view carbon entries for leaderboard" ON public.carbon_entries
    FOR SELECT USING (true);

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view own entries" ON public.carbon_entries;

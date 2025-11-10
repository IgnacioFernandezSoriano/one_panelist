-- Fix RLS policies for scheduled_panelist_changes table
-- This script drops and recreates all RLS policies to ensure they work correctly

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own scheduled changes" ON scheduled_panelist_changes;
DROP POLICY IF EXISTS "Users can create scheduled changes" ON scheduled_panelist_changes;
DROP POLICY IF EXISTS "Users can update their own scheduled changes" ON scheduled_panelist_changes;
DROP POLICY IF EXISTS "Users can delete pending scheduled changes" ON scheduled_panelist_changes;

-- Ensure RLS is enabled
ALTER TABLE scheduled_panelist_changes ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT - Users can view changes for their cliente_id
CREATE POLICY "Users can view their own scheduled changes"
  ON scheduled_panelist_changes
  FOR SELECT
  USING (
    cliente_id IN (
      SELECT cliente_id 
      FROM usuarios 
      WHERE email = (SELECT auth.email())
    )
  );

-- Policy 2: INSERT - Users can create changes for their cliente_id
CREATE POLICY "Users can create scheduled changes"
  ON scheduled_panelist_changes
  FOR INSERT
  WITH CHECK (
    cliente_id IN (
      SELECT cliente_id 
      FROM usuarios 
      WHERE email = (SELECT auth.email())
    )
  );

-- Policy 3: UPDATE - Users can update their own changes
-- IMPORTANT: This policy must have both USING and WITH CHECK clauses
CREATE POLICY "Users can update their own scheduled changes"
  ON scheduled_panelist_changes
  FOR UPDATE
  USING (
    cliente_id IN (
      SELECT cliente_id 
      FROM usuarios 
      WHERE email = (SELECT auth.email())
    )
  )
  WITH CHECK (
    cliente_id IN (
      SELECT cliente_id 
      FROM usuarios 
      WHERE email = (SELECT auth.email())
    )
  );

-- Policy 4: DELETE - Users can delete their own pending changes
CREATE POLICY "Users can delete pending scheduled changes"
  ON scheduled_panelist_changes
  FOR DELETE
  USING (
    cliente_id IN (
      SELECT cliente_id 
      FROM usuarios 
      WHERE email = (SELECT auth.email())
    )
    AND status = 'pending'
  );

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'scheduled_panelist_changes'
ORDER BY policyname;

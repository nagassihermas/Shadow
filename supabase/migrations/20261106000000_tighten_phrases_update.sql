-- ==============================================================================
-- phrases_update allowed any authenticated user to modify the phrases of global
-- blocks (user_id IS NULL). With open sign-up and the public anon key, anyone
-- could overwrite shared content through the REST API.
-- Global blocks are now read-only for users; only a block's owner can update
-- its phrases.
-- ==============================================================================

DROP POLICY IF EXISTS "phrases_update" ON phrases;

CREATE POLICY "phrases_update" ON phrases
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM theme_blocks tb
      WHERE tb.id = phrases.block_id AND tb.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM theme_blocks tb
      WHERE tb.id = phrases.block_id AND tb.user_id = auth.uid()
    )
  );

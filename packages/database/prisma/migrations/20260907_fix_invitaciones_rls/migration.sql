-- Fix: restrict SELECT on invitaciones_pendientes to only the invited email
DROP POLICY IF EXISTS "Usuarios pueden ver invitaciones a su email" ON invitaciones_pendientes;
CREATE POLICY "Usuarios pueden ver invitaciones a su email"
  ON invitaciones_pendientes FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

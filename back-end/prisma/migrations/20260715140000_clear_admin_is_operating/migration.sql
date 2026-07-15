-- ADMIN/LEADER/SUPERADMIN não operam mais «Operação — movimentação».
-- Limpa isOperating residual nesses papéis (contagem da Frota e modo ativo).
UPDATE "User"
SET "isOperating" = NULL
WHERE "isOperating" IS NOT NULL
  AND "role" <> 'PALLET_TRANSPORTER';

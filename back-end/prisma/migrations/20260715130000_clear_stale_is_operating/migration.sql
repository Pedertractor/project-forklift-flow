-- isOperating (modo empilhadeira/transpaleteira) só é significativo para
-- quem pode operar transporte (PALLET_TRANSPORTER, ou ADMIN/SUPERADMIN em
-- substituição — ver assertPalletTransporterRole no back-end). Usuários
-- realocados para outro role (ex.: OPERATOR_MACHINE, SUPPLY_OPERATOR,
-- LEADER) antes desta correção ficaram com isOperating "preso", inflando
-- indevidamente o card "Frota" da TV (que conta só por isOperating, sem
-- olhar role). Daqui em diante, updateUserRole zera isOperating ao trocar
-- de role; esta migração só limpa o dado já inconsistente.
UPDATE "User"
SET "isOperating" = NULL
WHERE "isOperating" IS NOT NULL
  AND "role" NOT IN ('PALLET_TRANSPORTER', 'ADMIN', 'SUPERADMIN');

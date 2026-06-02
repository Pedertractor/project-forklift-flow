-- Deve rodar em migração separada: o valor do enum só pode ser usado após commit.
ALTER TYPE "RoleUser" ADD VALUE IF NOT EXISTS 'PALLET_TRANSPORTER';

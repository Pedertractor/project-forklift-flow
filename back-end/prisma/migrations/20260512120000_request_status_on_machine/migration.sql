-- AlterEnum: pallet na maquina de destino, aguardando retirada pelo operador / empilhadeira.
ALTER TYPE "RequestStatus" ADD VALUE 'ON_MACHINE' AFTER 'IN_PROGRESS';

import { useQuery } from '@tanstack/react-query';
import AccordionLoader from '@/components/accordionLoader/accordion-loader';
import { SimpleModal } from '@/components/crud/SimpleModal';
import { OperatorAssistedTrajectoryView } from '@/components/operator-moviment/operator-assisted-trajectory-view';
import { Button } from '@/components/ui/brand-button';
import { getOperatorCurrentTrajectory } from '@/services/operational-dashboard-api';
import { captalizeString } from '@/utils/captalizeString';

export interface OperatorCurrentTrajectoryDialogProps {
  open: boolean;
  operatorId: string | null;
  operatorName: string;
  onClose: () => void;
}

export function OperatorCurrentTrajectoryDialog({
  open,
  operatorId,
  operatorName,
  onClose,
}: OperatorCurrentTrajectoryDialogProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['operator-current-trajectory', operatorId],
    queryFn: () => getOperatorCurrentTrajectory(operatorId!),
    enabled: open && Boolean(operatorId),
    staleTime: 0,
  });

  return (
    <SimpleModal
      open={open}
      title="Trajeto atual"
      description={`Modo assistido — atividades em aberto de ${captalizeString(operatorName)}.`}
      onClose={onClose}
      showHeaderClose
      panelClassName="max-w-2xl"
      footer={
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <AccordionLoader />
        </div>
      ) : null}

      {isError ? (
        <p className="m-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Não foi possível carregar o trajeto deste operador. Tente novamente.
        </p>
      ) : null}

      {!isLoading && !isError && operatorId && data ? (
        <OperatorAssistedTrajectoryView
          tasks={data}
          operatorUserId={operatorId}
        />
      ) : null}
    </SimpleModal>
  );
}

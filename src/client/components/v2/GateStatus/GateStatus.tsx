import { useViewport } from '../../../hooks/useViewport';
import { MobileGateStatus } from './MobileGateStatus';
import { DesktopGateStatus } from './DesktopGateStatus';
import type { Gate } from '@shared/schemas';

export interface GateStatusV2Props {
  forceVariant?: 'mobile' | 'desktop' | 'auto';
  selectedGateId: string;
  gates: Gate[];
  onSelectGate: (id: string) => void;
  onOpenMobilePicker?: () => void;
}

export function GateStatusV2({
  forceVariant = 'auto',
  selectedGateId,
  gates,
  onSelectGate,
  onOpenMobilePicker,
}: GateStatusV2Props) {
  const { isDesktop } = useViewport();
  const shouldRenderDesktop = forceVariant === 'desktop' || (forceVariant === 'auto' && isDesktop);

  if (shouldRenderDesktop) {
    return (
      <DesktopGateStatus
        selectedGateId={selectedGateId}
        gates={gates}
        onSelectGate={onSelectGate}
      />
    );
  }

  const currentGate = gates.find((g) => g.id === selectedGateId) || gates[0] || {
    id: 'gate_main',
    name: 'Main Gate / Academic Blocks',
    curfewTime: '23:59',
    is24x7: true,
  };

  return (
    <MobileGateStatus
      gateName={currentGate.name}
      is24x7={currentGate.is24x7}
      curfewTime={currentGate.curfewTime}
      onClick={onOpenMobilePicker}
    />
  );
}

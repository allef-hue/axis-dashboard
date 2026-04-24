import { Status } from '../types';

interface StatusBadgeProps {
  status: Status;
}

const STATUS_MAP: Record<Status, { icon: string; label: string }> = {
  no_pace: { icon: '✓', label: 'NO PACE' },
  atencao: { icon: '⚠', label: 'ATENÇÃO' },
  critico: { icon: '✗', label: 'CRÍTICO' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { icon, label } = STATUS_MAP[status];
  return (
    <span className={`badge badge-${status}`}>
      {icon} {label}
    </span>
  );
}

/** Formata "YYYY-MM-DD" (padrão IXC) para "DD/MM/YYYY". */
export function formatDate(isoDate: string | undefined | null): string {
  if (!isoDate) return '--';
  const [date] = isoDate.split(' ');
  const [y, m, d] = date.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

/** Converte valor string do IXC ("129.90") para "R$ 129,90". */
export function formatCurrency(value: string | number | undefined | null): string {
  const num = typeof value === 'number' ? value : parseFloat(value ?? '0');
  if (Number.isNaN(num)) return 'R$ --';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

/** Remove tudo que não for dígito. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Mascara o CPF para exibição: ***.***.*00-** */
export function maskCpf(cpf: string | undefined | null): string {
  const digits = onlyDigits(cpf ?? '');
  if (digits.length !== 11) return '***.***.***-**';
  return `***.***.*${digits.slice(7, 9)}-**`;
}

/** Dias entre hoje e uma data "YYYY-MM-DD" (negativo = já passou). */
export function daysUntil(isoDate: string | undefined | null): number {
  if (!isoDate) return 0;
  const [date] = isoDate.split(' ');
  const target = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Mês de referência por extenso a partir do vencimento ("YYYY-MM-DD"). */
export function monthRef(isoDate: string | undefined | null): string {
  if (!isoDate) return '--';
  const [date] = isoDate.split(' ');
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '--';
  const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Iniciais do nome para o avatar (máx. 2 letras). */
export function initials(name: string | undefined | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

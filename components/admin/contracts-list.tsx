export type ContractListItem = {
  id: string;
  contractNumber: string;
  status: "issued" | "voided";
  issuedAt: Date;
  imageUsageAuthorized: boolean;
};

export function ContractsList({ contracts }: { contracts: ContractListItem[] }) {
  if (!contracts.length) {
    return <p className="font-sans text-sm text-muted">Nenhum contrato emitido.</p>;
  }

  return (
    <ul className="divide-y divide-line">
      {contracts.map((contract) => (
        <li key={contract.id} className="flex items-center justify-between gap-4 py-3">
          <span className="font-sans text-sm text-ink">{contract.contractNumber}</span>
          <a
            href={`/api/admin/contracts/${contract.id}/download`}
            aria-label={`Baixar PDF ${contract.contractNumber}`}
            className="underline underline-offset-2"
          >
            Baixar PDF
          </a>
        </li>
      ))}
    </ul>
  );
}

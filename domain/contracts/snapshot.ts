import type { ContractSnapshot } from "@/db/schema/contracts";
import { calculateBalance } from "@/domain/payments/balance";
import { addDecimal } from "@/lib/money";

export const CONTRACT_TERMS = {
  rescheduleFee: "50.00",
  rescheduleWindowDays: 15,
  refundWindowDays: 30,
} as const;

export const CONTRACT_TEMPLATE_VERSION = "1.0";
export const CONTRACTS_BUCKET = "contracts";

type PaymentInput = {
  amount: string;
  status: "pendente" | "confirmado" | "estornado";
};

type BuildContractSnapshotInput = {
  contractor: ContractSnapshot["contractor"];
  client: {
    name: string;
    cpf: string;
    birthday: string;
    phone: string | null;
    addressStreet: string;
    addressNumber: string;
    addressComplement?: string | null;
    addressNeighborhood: string;
    addressCity: string;
    addressState: string;
    addressPostalCode: string;
  };
  shoot: ContractSnapshot["shoot"];
  package: ContractSnapshot["package"];
  agreedPrice: string;
  payments: PaymentInput[];
  imageUsage: "authorized" | "not_authorized";
};

function formatClientAddress(client: BuildContractSnapshotInput["client"]): string {
  return [
    client.addressStreet,
    client.addressNumber,
    client.addressComplement,
    client.addressNeighborhood,
    `${client.addressCity} - ${client.addressState}`,
    client.addressPostalCode,
  ]
    .filter((part): part is string => Boolean(part))
    .join(", ");
}

export function buildContractSnapshot(input: BuildContractSnapshotInput): ContractSnapshot {
  const confirmedPaid = input.payments
    .filter((payment) => payment.status === "confirmado")
    .reduce((total, payment) => addDecimal(total, payment.amount), "0.00");
  const agreedPrice = addDecimal("0.00", input.agreedPrice);

  return {
    contractor: {
      personType: input.contractor.personType,
      legalName: input.contractor.legalName,
      document: input.contractor.document,
      address: input.contractor.address,
    },
    client: {
      name: input.client.name,
      cpf: input.client.cpf,
      birthday: input.client.birthday,
      address: formatClientAddress(input.client),
      phone: input.client.phone,
    },
    shoot: {
      date: input.shoot.date,
      startTime: input.shoot.startTime,
      locationName: input.shoot.locationName,
      locationAddress: input.shoot.locationAddress,
    },
    package: {
      name: input.package.name,
      description: input.package.description,
      durationMinutes: input.package.durationMinutes,
      includedPhotos: input.package.includedPhotos,
      scenes: input.package.scenes,
    },
    finance: {
      agreedPrice,
      confirmedPaid,
      balance: calculateBalance(agreedPrice, input.payments),
    },
    terms: {
      ...CONTRACT_TERMS,
      imageUsageAuthorized: input.imageUsage === "authorized",
    },
  };
}

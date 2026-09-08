import { z } from "zod";

export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidCpf(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;

  const digitAt = (length: number) => {
    const sum = cpf
      .slice(0, length)
      .split("")
      .reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return digitAt(9) === Number(cpf[9]) && digitAt(10) === Number(cpf[10]);
}

export function normalizePostalCode(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidPostalCode(postalCode: string): boolean {
  return /^\d{8}$/.test(postalCode);
}

export const issueContractSchema = z.object({
  shootId: z.string().uuid(),
  cpf: z.string().transform(normalizeCpf).refine(isValidCpf, "CPF inválido"),
  birthday: z.iso.date(),
  addressStreet: z.string().trim().min(1).max(180),
  addressNumber: z.string().trim().min(1).max(30),
  // Issuance submits the complete civil data. The form adapter drops empty
  // strings, so missing/blank complements must explicitly clear the saved value.
  addressComplement: z.string().trim().max(120).nullish().transform((value) => value || null),
  addressNeighborhood: z.string().trim().min(1).max(120),
  addressCity: z.string().trim().min(1).max(120),
  addressState: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  addressPostalCode: z.string().transform(normalizePostalCode).refine(isValidPostalCode, "CEP inválido"),
  imageUsage: z.enum(["authorized", "not_authorized"]),
});

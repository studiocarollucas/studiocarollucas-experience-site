import { z } from "zod";
import { isValidCpf, normalizeCpf } from "@/domain/contracts/schema";

export function normalizeCnpj(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidCnpj(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;

  const calculateDigit = (digits: string, weights: number[]) => {
    const sum = digits.split("").reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calculateDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calculateDigit(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return firstDigit === Number(cnpj[12]) && secondDigit === Number(cnpj[13]);
}

const profileFields = {
  legalName: z.string().trim().min(1).max(180),
  address: z.string().trim().min(1).max(500),
};

export const contractorProfileSchema = z.discriminatedUnion("personType", [
  z.object({
    personType: z.literal("individual"),
    ...profileFields,
    document: z.string().transform(normalizeCpf).refine(isValidCpf, "CPF inválido"),
  }),
  z.object({
    personType: z.literal("company"),
    ...profileFields,
    document: z.string().transform(normalizeCnpj).refine(isValidCnpj, "CNPJ inválido"),
  }),
]);

export type ContractorProfileInput = z.input<typeof contractorProfileSchema>;
export type ContractorProfileData = z.output<typeof contractorProfileSchema>;

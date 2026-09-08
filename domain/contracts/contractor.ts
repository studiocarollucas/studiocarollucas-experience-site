import "server-only";

import { isValidCpf, normalizeCpf } from "./schema";

export const CONTRACTOR_ENV_KEYS = [
  "STUDIO_CONTRACTOR_NAME",
  "STUDIO_CONTRACTOR_CPF",
  "STUDIO_CONTRACTOR_ADDRESS",
] as const;

export function getContractorProfile(env: NodeJS.ProcessEnv = process.env) {
  const [name, cpf, address] = CONTRACTOR_ENV_KEYS.map((key) => env[key]?.trim());
  if (!name || !cpf || !address) throw new Error("contractor configuration is incomplete");
  if (!isValidCpf(normalizeCpf(cpf))) throw new Error("contractor configuration is invalid");
  return { name, cpf: normalizeCpf(cpf), address };
}

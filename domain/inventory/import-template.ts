import "server-only";

import * as XLSX from "xlsx";

export const inventoryImportColumns = [
  "codigo",
  "nome",
  "tipo",
  "descricao",
  "cor",
  "tamanho",
  "status",
  "preco_interno",
  "ativo",
] as const;

export function createInventoryImportTemplate(): Uint8Array {
  const workbook = XLSX.utils.book_new();
  const acervo = XLSX.utils.aoa_to_sheet([
    [...inventoryImportColumns],
    ["CL-001", "Clutch dourada", "clutch", "Bolsa de mão", "dourado", "único", "available", "120.00", "true"],
  ]);
  const instructions = XLSX.utils.aoa_to_sheet([
    ["Instruções"],
    ["Preencha somente a aba Acervo."],
    ["Tipos permitidos: outfit, clutch, accessory, prop."],
    ["Status permitidos: available, maintenance, retired."],
    ["Ativo aceita true ou false. Preço interno usa decimal com ponto."],
    ["Fotos não são importadas pela planilha."],
  ]);
  XLSX.utils.book_append_sheet(workbook, acervo, "Acervo");
  XLSX.utils.book_append_sheet(workbook, instructions, "Instruções");

  return XLSX.write(workbook, { type: "array", bookType: "xlsx" });
}

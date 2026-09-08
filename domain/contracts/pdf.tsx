import "server-only";

import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

import type { ContractSnapshot } from "@/db/schema";
import { CONTRACT_TEMPLATE_VERSION } from "./snapshot";

export type ContractPdfInput = {
  contractNumber: string;
  issuedAt: string;
  snapshot: ContractSnapshot;
};

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingHorizontal: 48, paddingBottom: 58, fontFamily: "Helvetica", fontSize: 10, color: "#1f2937", lineHeight: 1.45 },
  header: { marginBottom: 18, borderBottomWidth: 1, borderBottomColor: "#374151", paddingBottom: 10 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 15, textAlign: "center", letterSpacing: 0.3 },
  meta: { fontSize: 8.5, textAlign: "center", marginTop: 5, color: "#4b5563" },
  section: { marginBottom: 12 },
  heading: { fontFamily: "Helvetica-Bold", fontSize: 10.5, marginBottom: 4, color: "#111827" },
  paragraph: { marginBottom: 4, textAlign: "justify" },
  label: { fontFamily: "Helvetica-Bold" },
  signatures: { flexDirection: "row", gap: 20, marginTop: 22 },
  signature: { flexGrow: 1, flexBasis: 0, borderTopWidth: 1, borderTopColor: "#374151", paddingTop: 5 },
  signatureLabel: { fontSize: 8.5, textAlign: "center" },
  signatureName: { fontSize: 8.5, textAlign: "center", marginTop: 2 },
  footer: { position: "absolute", bottom: 25, left: 48, right: 48, minHeight: 10, fontSize: 8, color: "#6b7280", textAlign: "center" },
});

function value(text: string | null | undefined): string {
  return text?.trim() || "Não informado";
}

function currency(amount: string): string {
  const [whole = "0", decimal = "00"] = amount.split(".");
  return `R$ ${Number(whole).toLocaleString("pt-BR")},${decimal.padEnd(2, "0").slice(0, 2)}`;
}

function contractDate(issuedAt: string): string {
  const date = new Date(issuedAt);
  return Number.isNaN(date.valueOf()) ? issuedAt : date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function Section({ title, children, keepTogether = false }: { title: string; children: React.ReactNode; keepTogether?: boolean }) {
  return (
    <View style={styles.section} wrap={!keepTogether}>
      <Text style={styles.heading}>{title}</Text>
      {children}
    </View>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

function ContractPageLayout({
  children,
  pageNumber,
  totalPages,
}: {
  children: React.ReactNode;
  pageNumber?: number;
  totalPages?: number;
}) {
  return (
    <>
      {children}
      <Text style={styles.footer}>
        Página {pageNumber} de {totalPages}
      </Text>
    </>
  );
}

function ContractPdfDocument({ contractNumber, issuedAt, snapshot }: ContractPdfInput) {
  const contractorDocumentLabel = snapshot.contractor.personType === "company" ? "CNPJ" : "CPF";
  const imageAuthorization = snapshot.terms.imageUsageAuthorized
    ? "A CONTRATANTE AUTORIZA o uso de imagem, voz e nome resultantes da sessão para divulgação do portfólio e dos canais institucionais da CONTRATADA, sem remuneração adicional."
    : "A CONTRATANTE NÃO AUTORIZA o uso de imagem, voz e nome resultantes da sessão para divulgação do portfólio e dos canais institucionais da CONTRATADA.";

  return (
    <Document title={`Contrato ${contractNumber}`} author="Modelo de contrato">
      <Page size="A4" style={styles.page} layout={ContractPageLayout}>
        <View style={styles.header}>
          <Text style={styles.title}>CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS</Text>
          <Text style={styles.meta}>Contrato nº {value(contractNumber)} - Emitido em {contractDate(issuedAt)} - Modelo {CONTRACT_TEMPLATE_VERSION}</Text>
        </View>

        <Section title="1. PARTES">
          <Paragraph><Text style={styles.label}>CONTRATADA: </Text>{value(snapshot.contractor.legalName)}, {contractorDocumentLabel} {value(snapshot.contractor.document)}, endereço {value(snapshot.contractor.address)}.</Paragraph>
          <Paragraph><Text style={styles.label}>CONTRATANTE: </Text>{value(snapshot.client.name)}, CPF {value(snapshot.client.cpf)}, nascida em {value(snapshot.client.birthday)}, endereço {value(snapshot.client.address)}, telefone {value(snapshot.client.phone)}.</Paragraph>
        </Section>

        <Section title="2. OBJETO, PACOTE E ENTREGÁVEIS">
          <Paragraph>A CONTRATADA realizará o pacote <Text style={styles.label}>{value(snapshot.package.name)}</Text>, com duração estimada de {snapshot.package.durationMinutes} minutos, incluindo {snapshot.package.includedPhotos} fotos.</Paragraph>
          <Paragraph>Descrição: {value(snapshot.package.description)}. Cenas/ambientes: {value(snapshot.package.scenes)}. Os arquivos finais serão entregues conforme o pacote contratado, após a seleção e o tratamento aplicáveis.</Paragraph>
        </Section>

        <Section title="3. DATA, HORÁRIO E LOCAL">
          <Paragraph>A sessão está agendada para {value(snapshot.shoot.date)}, às {value(snapshot.shoot.startTime)}, em {value(snapshot.shoot.locationName)}, no endereço {value(snapshot.shoot.locationAddress)}.</Paragraph>
        </Section>

        <Section title="4. PREÇO, PAGAMENTOS E SALDO">
          <Paragraph>O preço total contratado é {currency(snapshot.finance.agreedPrice)}. O valor confirmado até a emissão é {currency(snapshot.finance.confirmedPaid)} e o saldo pendente é {currency(snapshot.finance.balance)}.</Paragraph>
          <Paragraph>O saldo deverá ser pago na forma ajustada entre as partes. A entrega dos arquivos finais poderá ocorrer após a quitação integral do valor contratado.</Paragraph>
        </Section>

        <Section title="5. REMARCAÇÃO">
          <Paragraph>Pedidos de remarcação devem ser comunicados com antecedência mínima de {snapshot.terms.rescheduleWindowDays} dias. Quando aplicável, será cobrada taxa de remarcação de {currency(snapshot.terms.rescheduleFee)}, além de eventual diferença de preço do novo pacote ou data.</Paragraph>
        </Section>

        <Section title="6. CANCELAMENTO E REEMBOLSO">
          <Paragraph>O cancelamento deverá ser solicitado por escrito. Eventual reembolso será analisado conforme os serviços já reservados ou executados e será processado em até {snapshot.terms.refundWindowDays} dias, quando devido.</Paragraph>
        </Section>

        <Section title="7. AUTORIZAÇÃO DE USO DE IMAGEM">
          <Paragraph>{imageAuthorization}</Paragraph>
          <Paragraph>A autorização ou a não autorização não altera a titularidade da CONTRATANTE sobre sua própria imagem nem o dever da CONTRATADA de usar o material com respeito e finalidade compatível com esta cláusula.</Paragraph>
        </Section>

        <Section title="8. DADOS PESSOAIS">
          <Paragraph>Os dados pessoais deste contrato serão utilizados exclusivamente para executar, registrar e comprovar a relação contratual, cumprir obrigações legais e viabilizar a comunicação necessária sobre a sessão e a entrega.</Paragraph>
        </Section>

        <Section title="9. ASSINATURAS" keepTogether>
          <Paragraph>As partes declaram que leram e concordam com as condições deste contrato. Blocos para assinatura manual:</Paragraph>
          <View style={styles.signatures}>
            <View style={styles.signature}>
              <Text style={styles.signatureLabel}>CONTRATADA</Text>
              <Text style={styles.signatureName}>{value(snapshot.contractor.legalName)}</Text>
            </View>
            <View style={styles.signature}>
              <Text style={styles.signatureLabel}>CONTRATANTE</Text>
              <Text style={styles.signatureName}>{value(snapshot.client.name)}</Text>
            </View>
          </View>
        </Section>
      </Page>
    </Document>
  );
}

export async function renderContractPdf(input: ContractPdfInput): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(<ContractPdfDocument {...input} />));
}

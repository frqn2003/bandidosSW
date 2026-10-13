import * as React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Hr,
  Preview,
} from "@react-email/components";

export interface ComprobantePagoEmailProps {
  numeroComprobante: string;
  alumnoNombre: string;
  concepto: string;
  monto: number;
  fechaPago: string;
  formaPago: string;
  codigoTurno?: string;
  observaciones?: string;
}

export function ComprobantePagoEmail({
  numeroComprobante = "REC-00124",
  alumnoNombre = "Alumno",
  concepto = "Clase de Apoyo - Matemática",
  monto = 15000,
  fechaPago = "2026-10-13",
  formaPago = "Efectivo",
  codigoTurno,
  observaciones,
}: ComprobantePagoEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Recibo de pago {numeroComprobante} · Centro Académico</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerStyle}>
            <Heading style={headerTitleStyle}>Centro Académico</Heading>
            <Text style={headerSubtitleStyle}>Recibo de Pago Oficial</Text>
          </Section>

          {/* Content */}
          <Section style={contentStyle}>
            <Section style={badgeContainerStyle}>
              <Text style={badgeStyle}>Recibo Nº {numeroComprobante}</Text>
              <Text style={statusBadgeStyle}>Pagado</Text>
            </Section>

            <Heading as="h2" style={titleStyle}>
              Hola, {alumnoNombre}
            </Heading>
            <Text style={paragraphStyle}>
              Adjuntamos la constancia de pago registrado correctamente en el sistema:
            </Text>

            {/* Amount card */}
            <Section style={amountCardStyle}>
              <Text style={amountLabelStyle}>Total abonado</Text>
              <Text style={amountValueStyle}>
                ${monto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </Text>
            </Section>

            {/* Details Table */}
            <Section style={detailsCardStyle}>
              <Section style={rowStyle}>
                <Text style={labelStyle}>Concepto</Text>
                <Text style={valueStyle}>{concepto}</Text>
              </Section>
              <Hr style={rowDividerStyle} />

              {codigoTurno && (
                <>
                  <Section style={rowStyle}>
                    <Text style={labelStyle}>Código de Turno</Text>
                    <Text style={valueStyle}>{codigoTurno}</Text>
                  </Section>
                  <Hr style={rowDividerStyle} />
                </>
              )}

              <Section style={rowStyle}>
                <Text style={labelStyle}>Fecha de Pago</Text>
                <Text style={valueStyle}>{fechaPago}</Text>
              </Section>
              <Hr style={rowDividerStyle} />

              <Section style={rowStyle}>
                <Text style={labelStyle}>Forma de Pago</Text>
                <Text style={valueStyle}>{formaPago}</Text>
              </Section>

              {observaciones && (
                <>
                  <Hr style={rowDividerStyle} />
                  <Section style={rowStyle}>
                    <Text style={labelStyle}>Observaciones</Text>
                    <Text style={valueStyle}>{observaciones}</Text>
                  </Section>
                </>
              )}
            </Section>

            <Text style={noticeStyle}>
              Este comprobante es un documento de constancia válido expedido por la
              administración del Centro Académico.
            </Text>

            <Hr style={dividerStyle} />

            <Text style={footerTextStyle}>
              Centro Académico · Área de Cobranzas y Tesorería.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default ComprobantePagoEmail;

// ── Estilos (Nexo Académico) ──────────────────────────────────────────────
const mainStyle: React.CSSProperties = {
  backgroundColor: "#f1f5f9",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  padding: "40px 0",
};

const containerStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "560px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  overflow: "hidden",
  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.05)",
};

const headerStyle: React.CSSProperties = {
  backgroundColor: "#00236f",
  padding: "24px 32px",
  textAlign: "center",
};

const headerTitleStyle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: "bold",
  margin: 0,
};

const headerSubtitleStyle: React.CSSProperties = {
  color: "#adc6ff",
  fontSize: "12px",
  margin: "4px 0 0 0",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const contentStyle: React.CSSProperties = {
  padding: "32px",
};

const badgeContainerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "16px",
};

const badgeStyle: React.CSSProperties = {
  backgroundColor: "#f1f5f9",
  color: "#334155",
  fontSize: "12px",
  fontWeight: "bold",
  padding: "4px 10px",
  borderRadius: "4px",
  display: "inline-block",
  margin: 0,
};

const statusBadgeStyle: React.CSSProperties = {
  backgroundColor: "#dcfce7",
  color: "#166534",
  fontSize: "11px",
  fontWeight: "bold",
  padding: "4px 10px",
  borderRadius: "9999px",
  textTransform: "uppercase",
  display: "inline-block",
  margin: 0,
};

const titleStyle: React.CSSProperties = {
  color: "#1e293b",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "0 0 12px 0",
};

const paragraphStyle: React.CSSProperties = {
  color: "#475569",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 20px 0",
};

const amountCardStyle: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  padding: "16px",
  textAlign: "center",
  marginBottom: "20px",
};

const amountLabelStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  margin: "0 0 4px 0",
};

const amountValueStyle: React.CSSProperties = {
  color: "#16a34a", // status success strong
  fontSize: "28px",
  fontWeight: "bold",
  margin: 0,
};

const detailsCardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  padding: "16px 20px",
  marginBottom: "20px",
};

const rowStyle: React.CSSProperties = {
  padding: "4px 0",
};

const labelStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  margin: "0 0 2px 0",
};

const valueStyle: React.CSSProperties = {
  color: "#1e293b",
  fontSize: "14px",
  fontWeight: "600",
  margin: 0,
};

const rowDividerStyle: React.CSSProperties = {
  borderTop: "1px solid #e2e8f0",
  margin: "8px 0",
};

const noticeStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "18px",
  fontStyle: "italic",
  margin: "0 0 20px 0",
};

const dividerStyle: React.CSSProperties = {
  borderTop: "1px solid #e2e8f0",
  margin: "24px 0 16px 0",
};

const footerTextStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "12px",
  textAlign: "center",
  margin: 0,
};

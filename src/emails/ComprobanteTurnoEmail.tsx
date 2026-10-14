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

export interface ComprobanteTurnoEmailProps {
  codigoTurno: string;
  alumnoNombre: string;
  profesorNombre: string;
  materiaNombre: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  aula?: string;
  sede?: string;
  precio?: number;
  estado?: string;
}

export function ComprobanteTurnoEmail({
  codigoTurno = "TUR-0001",
  alumnoNombre = "Alumno",
  profesorNombre = "Profesor",
  materiaNombre = "Matemática",
  fecha = "2026-10-15",
  horaInicio = "09:00",
  horaFin = "10:00",
  aula = "Aula 3",
  sede = "Central",
  precio,
  estado = "Reservado",
}: ComprobanteTurnoEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Comprobante de turno {codigoTurno} · Centro Académico</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerStyle}>
            <Heading style={headerTitleStyle}>Centro Académico</Heading>
            <Text style={headerSubtitleStyle}>Comprobante Oficial de Turno</Text>
          </Section>

          {/* Content */}
          <Section style={contentStyle}>
            <Section style={badgeContainerStyle}>
              <Text style={badgeStyle}>{codigoTurno}</Text>
              <Text style={statusBadgeStyle}>{estado}</Text>
            </Section>

            <Heading as="h2" style={titleStyle}>
              Hola, {alumnoNombre}
            </Heading>
            <Text style={paragraphStyle}>
              Te confirmamos la reserva de tu clase de apoyo con los siguientes detalles:
            </Text>

            {/* Details Table */}
            <Section style={detailsCardStyle}>
              <Section style={rowStyle}>
                <Text style={labelStyle}>Materia</Text>
                <Text style={valueHighlightStyle}>{materiaNombre}</Text>
              </Section>
              <Hr style={rowDividerStyle} />

              <Section style={rowStyle}>
                <Text style={labelStyle}>Profesor/a</Text>
                <Text style={valueStyle}>{profesorNombre}</Text>
              </Section>
              <Hr style={rowDividerStyle} />

              <Section style={rowStyle}>
                <Text style={labelStyle}>Fecha</Text>
                <Text style={valueStyle}>{fecha}</Text>
              </Section>
              <Hr style={rowDividerStyle} />

              <Section style={rowStyle}>
                <Text style={labelStyle}>Horario</Text>
                <Text style={valueStyle}>
                  {horaInicio} a {horaFin} hs
                </Text>
              </Section>

              {(aula || sede) && (
                <>
                  <Hr style={rowDividerStyle} />
                  <Section style={rowStyle}>
                    <Text style={labelStyle}>Ubicación</Text>
                    <Text style={valueStyle}>
                      {[sede, aula].filter(Boolean).join(" · ")}
                    </Text>
                  </Section>
                </>
              )}

              {precio !== undefined && (
                <>
                  <Hr style={rowDividerStyle} />
                  <Section style={rowStyle}>
                    <Text style={labelStyle}>Arancel</Text>
                    <Text style={valueStyle}>
                      ${precio.toLocaleString("es-AR")}
                    </Text>
                  </Section>
                </>
              )}
            </Section>

            <Text style={noticeStyle}>
              <strong>Recordatorio:</strong> Te pedimos asistir con 5 minutos de anticipación.
              Si necesitas reprogramar o cancelar, recordá hacerlo con al menos 2 horas de anticipación.
            </Text>

            <Hr style={dividerStyle} />

            <Text style={footerTextStyle}>
              Centro Académico · Sistema de Gestión y Turnos.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default ComprobanteTurnoEmail;

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
  backgroundColor: "#dbe4ff",
  color: "#00236f",
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

const detailsCardStyle: React.CSSProperties = {
  backgroundColor: "#f8fafc",
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

const valueHighlightStyle: React.CSSProperties = {
  color: "#00236f",
  fontSize: "16px",
  fontWeight: "bold",
  margin: 0,
};

const rowDividerStyle: React.CSSProperties = {
  borderTop: "1px solid #e2e8f0",
  margin: "8px 0",
};

const noticeStyle: React.CSSProperties = {
  backgroundColor: "#eff6ff",
  borderLeft: "3px solid #2f6fed",
  color: "#1e3a8a",
  fontSize: "12px",
  lineHeight: "18px",
  padding: "10px 14px",
  borderRadius: "2px",
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

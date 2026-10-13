import * as React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
  Preview,
} from "@react-email/components";

export interface PasswordTemporalEmailProps {
  nombreCompleto: string;
  email: string;
  passwordTemporal: string;
  urlLogin?: string;
}

export function PasswordTemporalEmail({
  nombreCompleto = "Usuario",
  email = "usuario@academia.edu.ar",
  passwordTemporal = "Tmp123456",
  urlLogin = "http://localhost:3000",
}: PasswordTemporalEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Tus credenciales de acceso al Centro Académico</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerStyle}>
            <Heading style={headerTitleStyle}>Centro Académico</Heading>
            <Text style={headerSubtitleStyle}>Gestión Académica y Turnos</Text>
          </Section>

          {/* Body Content */}
          <Section style={contentStyle}>
            <Heading as="h2" style={titleStyle}>
              ¡Bienvenido/a, {nombreCompleto}!
            </Heading>
            <Text style={paragraphStyle}>
              Se ha creado tu cuenta de acceso al sistema con el correo{" "}
              <strong>{email}</strong>.
            </Text>

            <Text style={paragraphStyle}>
              Para ingresar por primera vez, utiliza tu contraseña temporal:
            </Text>

            {/* Password box */}
            <Section style={credentialBoxStyle}>
              <Text style={credentialLabelStyle}>Contraseña temporal</Text>
              <Text style={credentialValueStyle}>{passwordTemporal}</Text>
            </Section>

            <Text style={noteStyle}>
              * Por seguridad, el sistema te solicitará cambiar esta contraseña inmediatamente
              después de tu primer inicio de sesión.
            </Text>

            {/* Action button */}
            <Section style={buttonContainerStyle}>
              <Button href={urlLogin} style={buttonStyle}>
                Iniciar Sesión
              </Button>
            </Section>

            <Hr style={dividerStyle} />

            <Text style={footerTextStyle}>
              Si no solicitaste este acceso o crees que se trata de un error, por favor contacta
              a Mesa de Entrada de la academia.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default PasswordTemporalEmail;

// ── Estilos (Paleta Nexo Académico / MD3) ──────────────────────────────────
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
  backgroundColor: "#00236f", // Primary navy
  padding: "28px 32px",
  textAlign: "center",
};

const headerTitleStyle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: "bold",
  margin: 0,
  letterSpacing: "-0.5px",
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

const titleStyle: React.CSSProperties = {
  color: "#1e293b",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "0 0 16px 0",
};

const paragraphStyle: React.CSSProperties = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 16px 0",
};

const credentialBoxStyle: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  border: "1px dashed #2f6fed",
  borderRadius: "6px",
  padding: "16px 20px",
  margin: "20px 0",
  textAlign: "center",
};

const credentialLabelStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "bold",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  margin: "0 0 4px 0",
};

const credentialValueStyle: React.CSSProperties = {
  color: "#00236f",
  fontFamily: "monospace",
  fontSize: "24px",
  fontWeight: "bold",
  letterSpacing: "2px",
  margin: 0,
};

const noteStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
  fontStyle: "italic",
  lineHeight: "18px",
  margin: "0 0 24px 0",
};

const buttonContainerStyle: React.CSSProperties = {
  textAlign: "center",
  margin: "28px 0 20px 0",
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: "#2f6fed",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center",
  display: "inline-block",
  padding: "12px 28px",
};

const dividerStyle: React.CSSProperties = {
  borderTop: "1px solid #e2e8f0",
  margin: "28px 0 20px 0",
};

const footerTextStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "12px",
  lineHeight: "18px",
  margin: 0,
  textAlign: "center",
};

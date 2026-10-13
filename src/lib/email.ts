import * as React from "react";
import { render } from "@react-email/components";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import { EnvioEmailError } from "./http/errors";
import {
  PasswordTemporalEmail,
  type PasswordTemporalEmailProps,
  ComprobanteTurnoEmail,
  type ComprobanteTurnoEmailProps,
  ComprobantePagoEmail,
  type ComprobantePagoEmailProps,
} from "@/emails";

// ── 1. Transporte Nodemailer (Gmail / SMTP propio) ────────────────────────
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT || 465);

const transporter =
  smtpUser && smtpPass
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })
    : null;

// ── 2. Cliente Resend (API Key de resend.com) ──────────────────────────────
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const rawEmailFrom = process.env.EMAIL_FROM?.trim();
const EMAIL_FROM =
  rawEmailFrom && rawEmailFrom.includes("@")
    ? rawEmailFrom
    : smtpUser
      ? `${rawEmailFrom || "Centro Académico"} <${smtpUser}>`
      : "Centro Académico <onboarding@resend.dev>";

const EMAIL_DEV_DESTINATARIO = process.env.EMAIL_DEV_DESTINATARIO?.trim();

/**
 * Función central para enviar correos transaccionales:
 * 1. Si está configurado SMTP_USER + SMTP_PASS → envía con Nodemailer (Gmail).
 * 2. Si está configurado RESEND_API_KEY → envía con Resend.
 * 3. Si no hay credenciales → simula en la consola del servidor ([email:mock]).
 */
async function enviarEmailTransaccional({
  to,
  subject,
  react,
  logInfo,
}: {
  to: string;
  subject: string;
  react: React.ReactElement;
  logInfo: string;
}): Promise<void> {
  // Simulación explícita de fallo para testing si está activado
  if (process.env.SIMULAR_FALLO_EMAIL === "true") {
    throw new EnvioEmailError("Fallo simulado en el proveedor de correo electrónico.");
  }

  // Si se definió un destinatario de desarrollo, se redirige el correo para pruebas
  const destinatarioFinal = EMAIL_DEV_DESTINATARIO || to;

  // 1. Envío vía Nodemailer (Gmail / SMTP)
  if (transporter) {
    try {
      const html = await render(react);
      await transporter.sendMail({
        from: EMAIL_FROM,
        to: destinatarioFinal,
        subject,
        html,
      });

      console.info(
        `[email:nodemailer] Correo enviado exitosamente a ${destinatarioFinal} (original: ${to}) — "${subject}"`,
      );
      return;
    } catch (error) {
      console.error("[email:nodemailer] Error al enviar correo por SMTP:", error);
      throw new EnvioEmailError();
    }
  }

  // 2. Envío vía Resend
  if (resend) {
    try {
      const { error } = await resend.emails.send({
        from: EMAIL_FROM,
        to: destinatarioFinal,
        subject,
        react,
      });

      if (error) {
        console.error("[email:resend] Error devuelto por Resend:", error);
        throw new EnvioEmailError(error.message);
      }

      console.info(
        `[email:resend] Correo enviado exitosamente a ${destinatarioFinal} (original: ${to}) — "${subject}"`,
      );
      return;
    } catch (error) {
      if (error instanceof EnvioEmailError) throw error;
      console.error("[email:resend] Excepción al contactar la API de Resend:", error);
      throw new EnvioEmailError();
    }
  }

  // 3. Mock en consola si no hay credenciales configuradas
  console.info(
    `[email:mock] Enviar a: ${destinatarioFinal} (original: ${to}) | Asunto: "${subject}" | Detalle: ${logInfo}`,
  );
}

/**
 * Envía la contraseña temporal generada al usuario registrado (§HU-SIS-00).
 */
export async function enviarPasswordTemporal(
  email: string,
  passwordTemporal: string,
  nombreCompleto: string,
): Promise<void> {
  await enviarEmailTransaccional({
    to: email,
    subject: "Tus credenciales de acceso · Centro Académico",
    react: React.createElement(PasswordTemporalEmail, {
      nombreCompleto,
      email,
      passwordTemporal,
    } as PasswordTemporalEmailProps),
    logInfo: `Usuario: ${nombreCompleto}, Pass: ${passwordTemporal}`,
  });
}

/**
 * Envía el comprobante de reserva de turno por email al alumno (§HU-TUR-01 / §HU-CAL-01).
 */
export async function enviarComprobanteTurno(
  email: string,
  datos: ComprobanteTurnoEmailProps,
): Promise<void> {
  await enviarEmailTransaccional({
    to: email,
    subject: `Comprobante de Turno ${datos.codigoTurno} · Centro Académico`,
    react: React.createElement(ComprobanteTurnoEmail, datos),
    logInfo: `Turno: ${datos.codigoTurno}, Materia: ${datos.materiaNombre}, Fecha: ${datos.fecha}`,
  });
}

/**
 * Envía el comprobante/recibo de pago por email (§HU-PAG-01).
 */
export async function enviarComprobantePago(
  email: string,
  datos: ComprobantePagoEmailProps,
): Promise<void> {
  await enviarEmailTransaccional({
    to: email,
    subject: `Comprobante de Pago Nº ${datos.numeroComprobante} · Centro Académico`,
    react: React.createElement(ComprobantePagoEmail, datos),
    logInfo: `Recibo: ${datos.numeroComprobante}, Total: $${datos.monto}, Concepto: ${datos.concepto}`,
  });
}

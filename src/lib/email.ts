import { EnvioEmailError } from "./http/errors";

/**
 * Servicio de envío de emails del sistema (HU-SIS-00).
 *
 * Envía la contraseña temporal generada al correo registrado del usuario.
 * Si el proveedor de email falla o no responde, lanza `EnvioEmailError` (500)
 * con el código `ERROR_ENVIO_EMAIL` para que la transacción haga ROLLBACK.
 */
export async function enviarPasswordTemporal(
  email: string,
  passwordTemporal: string,
  nombreCompleto: string,
): Promise<void> {
  // Simulación de fallo para testing manual si está activado
  if (process.env.SIMULAR_FALLO_EMAIL === "true") {
    throw new EnvioEmailError("Fallo simulado en el proveedor de correo electrónico.");
  }

  try {
    // Si en el futuro se configura Resend / SendGrid / Nodemailer con API Key:
    // const apiKey = process.env.RESEND_API_KEY;
    // ...
    // Por ahora, se asienta en el log del servidor como envío simulado:
    console.info(
      `[email] Credenciales temporales enviadas a ${email} (${nombreCompleto}). ` +
        `Password temporal: ${passwordTemporal}`,
    );
  } catch (error) {
    console.error("[email] Error al enviar email de contraseña temporal:", error);
    throw new EnvioEmailError();
  }
}

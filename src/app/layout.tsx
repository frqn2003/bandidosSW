import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SesionProvider } from "@/funciones/sesion";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Centro Académico",
  description: "Sistema de gestión académica — alumnos, docentes, turnos, asistencia y cobranzas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        {/* Iconos del design system: Material Symbols Outlined.
            No está en el catálogo de next/font y Tailwind descarta los @import
            remotos, así que se carga como hoja externa desde Google Fonts.
            Los estilos base (.material-symbols-outlined) viven en globals.css. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Justificación: no-page-custom-font es una regla del Pages Router.
            En el App Router el layout raíz aplica a toda la app → falso positivo. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col bg-surface text-on-surface">
        {/* La sesión (HU-SIS-01) envuelve toda la app: el login, las
            pantallas con guard y el aviso de expiración comparten estado. */}
        <SesionProvider>{children}</SesionProvider>
      </body>
    </html>
  );
}
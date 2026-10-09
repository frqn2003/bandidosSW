import { User } from "./useUsers";

export function usuariosACsv(usuarios: User[]): string {
  const encabezados = ["ID", "Nombre", "Apellido", "DNI", "Rol", "Estado", "Email", "Teléfono"];
  
  const filas = usuarios.map((u) => [
    u.id.toString(),
    `"${u.firstName.replace(/"/g, '""')}"`,
    `"${u.lastName.replace(/"/g, '""')}"`,
    `"${u.dni}"`,
    `"${u.role}"`,
    `"${u.status}"`,
    `"${u.email}"`,
    `"${u.phone || ""}"`,
  ]);

  return [encabezados.join(";"), ...filas.map((f) => f.join(";"))].join("\r\n");
}

export function descargarCsv(contenidoCsv: string, nombreArchivo: string) {
  // BOM para que Excel en español (y otros) reconozca UTF-8
  const bom = "\uFEFF";
  const blob = new Blob([bom + contenidoCsv], { type: "text/csv;charset=utf-8;" });
  
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", nombreArchivo);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

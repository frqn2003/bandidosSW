import type { AgendaResponse } from "@/contracts/agenda";
import { NotFoundError } from "@/lib/http/errors";
import * as repo from "./agenda.repo";
import * as mapper from "./agenda.mapper";

/**
 * Devuelve la agenda de una academia con sus franjas horarias de atención (§HU-CAL-01).
 */
export async function verPorAcademia(
  academiaId: number,
  incluirInactivas = false,
): Promise<AgendaResponse> {
  const agenda = await repo.findAgendaPorAcademia(academiaId);
  if (!agenda) {
    throw new NotFoundError("la agenda de la academia", academiaId);
  }

  const franjas = await repo.findFranjas(agenda.id, incluirInactivas);
  const franjasApi = franjas.map(mapper.franjaToApi);

  return mapper.toApi(agenda, franjasApi);
}

/**
 * Devuelve la agenda de atención por defecto (la primera activa).
 */
export async function verAgendaDefault(
  incluirInactivas = false,
): Promise<AgendaResponse> {
  const agenda = await repo.findPrimeraAgendaActiva();
  if (!agenda) {
    throw new NotFoundError("la agenda de atención del centro");
  }

  const franjas = await repo.findFranjas(agenda.id, incluirInactivas);
  const franjasApi = franjas.map(mapper.franjaToApi);

  return mapper.toApi(agenda, franjasApi);
}

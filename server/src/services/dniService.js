/**
 * DNI Lookup Service — Factiliza API
 * https://api.factiliza.com/pe/v1/dni/info/{dni}
 *
 * Primero busca en la BD local (gratis), luego consulta Factiliza.
 */
import { config } from '../config/env.js';

export async function lookupDni(dni) {
  if (!config.factilizaToken) {
    console.warn('FACTILIZA_TOKEN no configurado — devolviendo null');
    return null;
  }

  try {
    const resp = await fetch(
      `https://api.factiliza.com/pe/v1/dni/info/${dni}`,
      { headers: { Authorization: `Bearer ${config.factilizaToken}` } }
    );

    if (!resp.ok) {
      console.warn(`Factiliza respondió ${resp.status} para DNI ${dni}`);
      return null;
    }

    const { data } = await resp.json();

    return {
      nombres: data.nombres || '',
      apellidoPaterno: data.apellido_paterno || '',
      apellidoMaterno: data.apellido_materno || '',
      ubigeo: data.ubigeo_reniec || '',
      distrito: data.distrito || '',
      provincia: data.provincia || '',
      departamento: data.departamento || '',
    };
  } catch (err) {
    console.error('Error consultando Factiliza:', err.message);
    return null;
  }
}

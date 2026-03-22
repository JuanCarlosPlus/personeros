import * as svc from '../services/coverageService.js';

/**
 * Scope geográfico del directivo.
 * Admin (req.user) → ve todo.
 * Directivo → solo su ámbito según ubigeo asignado.
 *   ubigeo "15"     → solo departamento 15 (Lima)
 *   ubigeo "1501"   → solo provincia 1501
 *   ubigeo "150101" → solo distrito 150101
 */
function getScope(req) {
  if (req.user) return null; // admin → sin restricción
  if (!req.directivo) return null;
  return req.directivo.ubigeo || null; // string: "15", "1501", "150101"
}

function denyScope(res) {
  return res.status(403).json({ error: 'No tiene acceso a esta zona geográfica' });
}

export async function national(req, res, next) {
  try {
    const scope = getScope(req);
    const tipo = req.query.tipo || 'Nacional';
    const data = await svc.getNational(tipo);

    if (scope && data.regions) {
      // Filtrar regiones: directivo solo ve las que empiezan con su ubigeo
      data.regions = data.regions.filter(r => r.ubigeoPrefix?.startsWith(scope.substring(0, 2)));
      // Recalcular totales
      data.totalMesas = data.regions.reduce((a, r) => a + (r.totalMesas || 0), 0);
      data.asignadas = data.regions.reduce((a, r) => a + (r.asignadas || 0), 0);
      data.confirmadas = data.regions.reduce((a, r) => a + (r.confirmadas || 0), 0);
      data.totalElectores = data.regions.reduce((a, r) => a + (r.totalElectores || 0), 0);
      data.cobertura = data.totalMesas > 0 ? (data.asignadas / data.totalMesas * 100) : 0;
    }

    res.json(data);
  } catch (err) { next(err); }
}

export async function provinces(req, res, next) {
  try {
    const scope = getScope(req);
    if (scope && !req.params.deptCode.startsWith(scope.substring(0, 2))) {
      return denyScope(res);
    }
    res.json(await svc.getProvinces(req.params.deptCode));
  } catch (err) { next(err); }
}

export async function districts(req, res, next) {
  try {
    const scope = getScope(req);
    if (scope && scope.length >= 4 && !req.params.provCode.startsWith(scope.substring(0, 4))) {
      return denyScope(res);
    }
    if (scope && scope.length < 4 && !req.params.provCode.startsWith(scope.substring(0, 2))) {
      return denyScope(res);
    }
    res.json(await svc.getDistricts(req.params.provCode));
  } catch (err) { next(err); }
}

export async function centros(req, res, next) {
  try {
    const scope = getScope(req);
    if (scope && !req.params.ubigeo.startsWith(scope)) {
      return denyScope(res);
    }
    res.json(await svc.getCentros(req.params.ubigeo));
  } catch (err) { next(err); }
}

export async function mesasDelCentro(req, res, next) {
  try {
    const scope = getScope(req);
    const { ubigeo, idLocal } = req.params;
    if (scope && !ubigeo.startsWith(scope)) {
      return denyScope(res);
    }
    res.json(await svc.getMesasDelCentro(ubigeo, decodeURIComponent(idLocal)));
  } catch (err) { next(err); }
}

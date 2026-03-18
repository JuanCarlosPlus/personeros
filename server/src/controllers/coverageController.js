import * as svc from '../services/coverageService.js';

export async function national(req, res, next) {
  try {
    const tipo = req.query.tipo || 'Nacional'; // 'Nacional' | 'Extranjero' | 'all'
    res.json(await svc.getNational(tipo));
  } catch (err) { next(err); }
}

export async function provinces(req, res, next) {
  try {
    res.json(await svc.getProvinces(req.params.deptCode));
  } catch (err) { next(err); }
}

export async function districts(req, res, next) {
  try {
    res.json(await svc.getDistricts(req.params.provCode));
  } catch (err) { next(err); }
}

export async function centros(req, res, next) {
  try {
    res.json(await svc.getCentros(req.params.ubigeo));
  } catch (err) { next(err); }
}

export async function mesasDelCentro(req, res, next) {
  try {
    const { ubigeo, idLocal } = req.params;
    res.json(await svc.getMesasDelCentro(ubigeo, decodeURIComponent(idLocal)));
  } catch (err) { next(err); }
}

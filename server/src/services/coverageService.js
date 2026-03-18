/**
 * coverageService.js
 *
 * Servicio de cobertura usando los nombres de campo del partido en MongoDB.
 * Mesas: UBIGEO, MESA, ID_LOCAL, NOMBRE_LOCAL, DEPARTAMETO (typo), PROVINCIA,
 *         DISTRITO, DIRECCION, ELECTORES (string), tipoUbicacion
 *
 * Las respuestas al frontend usan nombres "limpios" (departamento, idLocal, etc.)
 * para no modificar el frontend.
 */
import Mesa from '../models/Mesa.js';

// ELECTORES es string en la BD → convertir a número en aggregation
const toIntElectores = { $toInt: '$ELECTORES' };

// Cobertura % reutilizable
const coberturaExpr = {
  $cond: [
    { $gt: ['$totalMesas', 0] },
    { $multiply: [{ $divide: ['$asignadas', '$totalMesas'] }, 100] },
    0,
  ],
};

async function getStats(match) {
  const [result] = await Mesa.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalMesas:     { $sum: 1 },
        totalElectores: { $sum: toIntElectores },
        asignadas:      { $sum: { $cond: [{ $gte: ['$status', 1] }, 1, 0] } },
        confirmadas:    { $sum: { $cond: [{ $eq: ['$status', 2] }, 1, 0] } },
      },
    },
  ]);
  if (!result) return { totalMesas: 0, totalElectores: 0, asignadas: 0, confirmadas: 0, cobertura: 0 };
  const cobertura = result.totalMesas > 0
    ? (result.asignadas / result.totalMesas) * 100
    : 0;
  return { totalMesas: result.totalMesas, totalElectores: result.totalElectores,
           asignadas: result.asignadas, confirmadas: result.confirmadas, cobertura };
}

// ── Nacional ─────────────────────────────────────────────────────────────────
// tipo: 'Nacional' (Perú) | 'Extranjero' | 'all' (sin filtro)
export async function getNational(tipo = 'Nacional') {
  const match = tipo === 'all' ? {} : { tipoUbicacion: tipo };
  const stats = await getStats(match);

  const regions = await Mesa.aggregate([
    { $match: match },
    {
      $group: {
        _id:            '$DEPARTAMETO',
        ubigeoPrefix:   { $first: { $substr: ['$UBIGEO', 0, 2] } },
        totalMesas:     { $sum: 1 },
        totalElectores: { $sum: toIntElectores },
        asignadas:      { $sum: { $cond: [{ $gte: ['$status', 1] }, 1, 0] } },
        confirmadas:    { $sum: { $cond: [{ $eq: ['$status', 2] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        departamento: '$_id',
        ubigeoPrefix: 1,
        totalMesas: 1,
        totalElectores: 1,
        asignadas: 1,
        confirmadas: 1,
        cobertura: coberturaExpr,
      },
    },
    { $sort: { departamento: 1 } },
  ]);

  return { ...stats, tipo, regions };
}

// ── Provincias de un departamento ─────────────────────────────────────────────
export async function getProvinces(deptCode) {
  const match = { UBIGEO: { $regex: `^${deptCode}` } };
  const stats = await getStats(match);

  const provinces = await Mesa.aggregate([
    { $match: match },
    {
      $group: {
        _id:            { $substr: ['$UBIGEO', 0, 4] },
        provincia:      { $first: '$PROVINCIA' },
        departamento:   { $first: '$DEPARTAMETO' },
        totalMesas:     { $sum: 1 },
        totalElectores: { $sum: toIntElectores },
        asignadas:      { $sum: { $cond: [{ $gte: ['$status', 1] }, 1, 0] } },
        confirmadas:    { $sum: { $cond: [{ $eq: ['$status', 2] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        ubigeoPrefix: '$_id',
        provincia: 1,
        departamento: 1,
        totalMesas: 1,
        totalElectores: 1,
        asignadas: 1,
        confirmadas: 1,
        cobertura: coberturaExpr,
      },
    },
    { $sort: { provincia: 1 } },
  ]);

  return { ...stats, departamento: deptCode, provinces };
}

// ── Distritos de una provincia ────────────────────────────────────────────────
export async function getDistricts(provCode) {
  const match = { UBIGEO: { $regex: `^${provCode}` } };
  const stats = await getStats(match);

  const districts = await Mesa.aggregate([
    { $match: match },
    {
      $group: {
        _id:            '$UBIGEO',
        distrito:       { $first: '$DISTRITO' },
        provincia:      { $first: '$PROVINCIA' },
        departamento:   { $first: '$DEPARTAMETO' },
        totalMesas:     { $sum: 1 },
        totalElectores: { $sum: toIntElectores },
        asignadas:      { $sum: { $cond: [{ $gte: ['$status', 1] }, 1, 0] } },
        confirmadas:    { $sum: { $cond: [{ $eq: ['$status', 2] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        ubigeo: '$_id',
        distrito: 1,
        provincia: 1,
        departamento: 1,
        totalMesas: 1,
        totalElectores: 1,
        asignadas: 1,
        confirmadas: 1,
        cobertura: coberturaExpr,
      },
    },
    { $sort: { distrito: 1 } },
  ]);

  return { ...stats, provincia: provCode, districts };
}

// ── Centros de votación (locales) de un distrito ──────────────────────────────
export async function getCentros(ubigeo) {
  const match = { UBIGEO: ubigeo };
  const stats = await getStats(match);

  const centros = await Mesa.aggregate([
    { $match: match },
    {
      $group: {
        _id:            '$ID_LOCAL',
        nombreLocal:    { $first: '$NOMBRE_LOCAL' },
        direccion:      { $first: '$DIRECCION' },
        ubigeo:         { $first: '$UBIGEO' },
        distrito:       { $first: '$DISTRITO' },
        provincia:      { $first: '$PROVINCIA' },
        departamento:   { $first: '$DEPARTAMETO' },
        totalMesas:     { $sum: 1 },
        totalElectores: { $sum: toIntElectores },
        asignadas:      { $sum: { $cond: [{ $gte: ['$status', 1] }, 1, 0] } },
        confirmadas:    { $sum: { $cond: [{ $eq: ['$status', 2] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        idLocal: '$_id',
        nombreLocal: 1,
        direccion: 1,
        ubigeo: 1,
        distrito: 1,
        provincia: 1,
        departamento: 1,
        totalMesas: 1,
        totalElectores: 1,
        asignadas: 1,
        confirmadas: 1,
        cobertura: coberturaExpr,
      },
    },
    { $sort: { nombreLocal: 1 } },
  ]);

  return { ...stats, ubigeo, centros };
}

// ── Mesas de un centro de votación ───────────────────────────────────────────
export async function getMesasDelCentro(ubigeo, idLocal) {
  const mesas = await Mesa.find({ UBIGEO: ubigeo, ID_LOCAL: idLocal })
    .populate('personeroId', 'nombres apellidoPaterno apellidoMaterno dni telefono correo assignmentStatus')
    .sort({ MESA: 1 })
    .lean();

  return mesas.map(m => ({
    id:           m._id,
    mesa:         m.MESA,
    ubigeo:       m.UBIGEO,
    idLocal:      m.ID_LOCAL,
    nombreLocal:  m.NOMBRE_LOCAL,
    direccion:    m.DIRECCION,
    distrito:     m.DISTRITO,
    provincia:    m.PROVINCIA,
    departamento: m.DEPARTAMETO,
    electores:    parseInt(m.ELECTORES) || 0,
    status:       m.status,
    personero:    m.personeroId || null,
  }));
}

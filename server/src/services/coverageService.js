import Mesa from '../models/Mesa.js';

// Build aggregation stats for a given match filter
async function getStats(match) {
  const [result] = await Mesa.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalMesas: { $sum: 1 },
        totalElectores: { $sum: '$electores' },
        asignadas: { $sum: { $cond: [{ $gte: ['$status', 1] }, 1, 0] } },
        confirmadas: { $sum: { $cond: [{ $eq: ['$status', 2] }, 1, 0] } },
      },
    },
  ]);
  if (!result) return { totalMesas: 0, totalElectores: 0, asignadas: 0, confirmadas: 0, cobertura: 0 };
  const cobertura = result.totalMesas > 0
    ? Math.round((result.asignadas / result.totalMesas) * 100)
    : 0;
  return { ...result, cobertura };
}

// National summary
export async function getNational() {
  const stats = await getStats({});

  // Per-region summary (departamento)
  const regions = await Mesa.aggregate([
    {
      $group: {
        _id: '$departamento',
        ubigeoPrefix: { $first: { $substr: ['$ubigeo', 0, 2] } },
        totalMesas: { $sum: 1 },
        totalElectores: { $sum: '$electores' },
        asignadas: { $sum: { $cond: [{ $gte: ['$status', 1] }, 1, 0] } },
        confirmadas: { $sum: { $cond: [{ $eq: ['$status', 2] }, 1, 0] } },
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
        cobertura: {
          $cond: [
            { $gt: ['$totalMesas', 0] },
            { $multiply: [{ $divide: ['$asignadas', '$totalMesas'] }, 100] },
            0,
          ],
        },
      },
    },
    { $sort: { departamento: 1 } },
  ]);

  return { ...stats, regions };
}

// Provinces of a department (ubigeo prefix = first 2 digits)
export async function getProvinces(deptCode) {
  const match = { ubigeo: { $regex: `^${deptCode}` } };
  const stats = await getStats(match);

  const provinces = await Mesa.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $substr: ['$ubigeo', 0, 4] },
        provincia: { $first: '$provincia' },
        departamento: { $first: '$departamento' },
        totalMesas: { $sum: 1 },
        totalElectores: { $sum: '$electores' },
        asignadas: { $sum: { $cond: [{ $gte: ['$status', 1] }, 1, 0] } },
        confirmadas: { $sum: { $cond: [{ $eq: ['$status', 2] }, 1, 0] } },
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
        cobertura: {
          $cond: [
            { $gt: ['$totalMesas', 0] },
            { $multiply: [{ $divide: ['$asignadas', '$totalMesas'] }, 100] },
            0,
          ],
        },
      },
    },
    { $sort: { provincia: 1 } },
  ]);

  return { ...stats, departamento: deptCode, provinces };
}

// Districts of a province (ubigeo prefix = first 4 digits)
export async function getDistricts(provCode) {
  const match = { ubigeo: { $regex: `^${provCode}` } };
  const stats = await getStats(match);

  const districts = await Mesa.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$ubigeo',
        distrito: { $first: '$distrito' },
        provincia: { $first: '$provincia' },
        departamento: { $first: '$departamento' },
        totalMesas: { $sum: 1 },
        totalElectores: { $sum: '$electores' },
        asignadas: { $sum: { $cond: [{ $gte: ['$status', 1] }, 1, 0] } },
        confirmadas: { $sum: { $cond: [{ $eq: ['$status', 2] }, 1, 0] } },
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
        cobertura: {
          $cond: [
            { $gt: ['$totalMesas', 0] },
            { $multiply: [{ $divide: ['$asignadas', '$totalMesas'] }, 100] },
            0,
          ],
        },
      },
    },
    { $sort: { distrito: 1 } },
  ]);

  return { ...stats, provincia: provCode, districts };
}

// Voting centers (locales) of a district (ubigeo = full 6 digits)
export async function getCentros(ubigeo) {
  const match = { ubigeo };
  const stats = await getStats(match);

  const centros = await Mesa.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$idLocal',
        nombreLocal: { $first: '$nombreLocal' },
        direccion: { $first: '$direccion' },
        ubigeo: { $first: '$ubigeo' },
        distrito: { $first: '$distrito' },
        provincia: { $first: '$provincia' },
        departamento: { $first: '$departamento' },
        totalMesas: { $sum: 1 },
        totalElectores: { $sum: '$electores' },
        asignadas: { $sum: { $cond: [{ $gte: ['$status', 1] }, 1, 0] } },
        confirmadas: { $sum: { $cond: [{ $eq: ['$status', 2] }, 1, 0] } },
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
        cobertura: {
          $cond: [
            { $gt: ['$totalMesas', 0] },
            { $multiply: [{ $divide: ['$asignadas', '$totalMesas'] }, 100] },
            0,
          ],
        },
      },
    },
    { $sort: { nombreLocal: 1 } },
  ]);

  return { ...stats, ubigeo, centros };
}

// Mesas of a voting center
export async function getMesasDelCentro(ubigeo, idLocal) {
  const mesas = await Mesa.find({ ubigeo, idLocal })
    .populate('personeroId', 'nombres apellidoPaterno apellidoMaterno dni telefono correo assignmentStatus')
    .sort({ mesa: 1 })
    .lean();

  return mesas.map(m => ({
    id: m._id,
    mesa: m.mesa,
    ubigeo: m.ubigeo,
    idLocal: m.idLocal,
    nombreLocal: m.nombreLocal,
    direccion: m.direccion,
    distrito: m.distrito,
    provincia: m.provincia,
    departamento: m.departamento,
    electores: m.electores,
    status: m.status,
    personero: m.personeroId || null,
  }));
}

/**
 * Seed demo data for development/testing
 * Creates sample mesas, locales, and personeros for Lima
 * Run: node src/scripts/seed-demo.js
 */
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { connectDB } from '../config/db.js';
import Mesa from '../models/Mesa.js';
import Personero from '../models/Personero.js';

const DISTRITOS_LIMA = [
  { ubigeo: '150101', departamento: 'LIMA', provincia: 'LIMA', distrito: 'LIMA' },
  { ubigeo: '150102', departamento: 'LIMA', provincia: 'LIMA', distrito: 'ANCON' },
  { ubigeo: '150103', departamento: 'LIMA', provincia: 'LIMA', distrito: 'ATE' },
  { ubigeo: '150104', departamento: 'LIMA', provincia: 'LIMA', distrito: 'BARRANCO' },
  { ubigeo: '150110', departamento: 'LIMA', provincia: 'LIMA', distrito: 'LA VICTORIA' },
  { ubigeo: '150111', departamento: 'LIMA', provincia: 'LIMA', distrito: 'LINCE' },
  { ubigeo: '150113', departamento: 'LIMA', provincia: 'LIMA', distrito: 'MIRAFLORES' },
  { ubigeo: '150122', departamento: 'LIMA', provincia: 'LIMA', distrito: 'SAN ISIDRO' },
  { ubigeo: '150130', departamento: 'LIMA', provincia: 'LIMA', distrito: 'SURCO' },
  { ubigeo: '150140', departamento: 'LIMA', provincia: 'LIMA', distrito: 'SAN JUAN DE LURIGANCHO' },
];

const CALLAO_DISTRITOS = [
  { ubigeo: '070101', departamento: 'CALLAO', provincia: 'CALLAO', distrito: 'CALLAO' },
  { ubigeo: '070102', departamento: 'CALLAO', provincia: 'CALLAO', distrito: 'BELLAVISTA' },
  { ubigeo: '070103', departamento: 'CALLAO', provincia: 'CALLAO', distrito: 'LA PERLA' },
  { ubigeo: '070104', departamento: 'CALLAO', provincia: 'CALLAO', distrito: 'LA PUNTA' },
];

const AREQUIPA_DISTRITOS = [
  { ubigeo: '040101', departamento: 'AREQUIPA', provincia: 'AREQUIPA', distrito: 'AREQUIPA' },
  { ubigeo: '040102', departamento: 'AREQUIPA', provincia: 'AREQUIPA', distrito: 'ALTO SELVA ALEGRE' },
  { ubigeo: '040103', departamento: 'AREQUIPA', provincia: 'AREQUIPA', distrito: 'CAYMA' },
];

const ALL_DISTRITOS = [...DISTRITOS_LIMA, ...CALLAO_DISTRITOS, ...AREQUIPA_DISTRITOS];

const LOCALES = [
  { id: 'L001', nombre: 'I.E. GRAN UNIDAD ESCOLAR', dir: 'AV. ABANCAY 123' },
  { id: 'L002', nombre: 'I.E. NACIONAL PEDRO RUIZ GALLO', dir: 'JR. CAILLOMA 456' },
  { id: 'L003', nombre: 'COLEGIO ALFREDO REBAZA ACOSTA', dir: 'AV. UNIVERSITARIA 789' },
  { id: 'L004', nombre: 'I.E. ROSA DE AMERICA', dir: 'AV. BRASIL 1010' },
];

const FIRST_NAMES = ['JUAN CARLOS', 'MARIA ELENA', 'PEDRO ANTONIO', 'ROSA MARIA', 'LUIS ALBERTO',
  'ANA CECILIA', 'JORGE ENRIQUE', 'CARMEN ROSA', 'CARLOS MANUEL', 'PATRICIA ISABEL'];
const LAST_NAMES_P = ['GARCIA', 'RODRIGUEZ', 'MENDOZA', 'TORRES', 'FLORES', 'RAMIREZ', 'CHAVEZ', 'QUISPE', 'HUANCA', 'MAMANI'];
const LAST_NAMES_M = ['LOPEZ', 'MARTINEZ', 'SANCHEZ', 'RAMOS', 'DIAZ', 'VEGA', 'MORALES', 'CASTILLO', 'VARGAS', 'SALAZAR'];

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rndInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function dniRnd() { return String(rndInt(10000000, 99999999)); }

async function main() {
  await connectDB();

  // Clear existing
  console.log('Limpiando datos anteriores...');
  await Mesa.deleteMany({});
  await Personero.deleteMany({});

  // Create mesas and locales
  console.log('Creando mesas...');
  const mesaDocs = [];
  let mesaCounter = 1;

  for (const dist of ALL_DISTRITOS) {
    const numLocales = rndInt(2, 4);
    for (let l = 0; l < numLocales; l++) {
      const local = LOCALES[l % LOCALES.length];
      const numMesas = rndInt(5, 20);
      for (let m = 0; m < numMesas; m++) {
        const mesaCode = String(mesaCounter).padStart(6, '0');
        mesaDocs.push({
          ubigeo: dist.ubigeo,
          idLocal: local.id + '_' + dist.ubigeo,
          mesa: mesaCode,
          departamento: dist.departamento,
          provincia: dist.provincia,
          distrito: dist.distrito,
          nombreLocal: local.nombre + ' - ' + dist.distrito,
          direccion: local.dir + ', ' + dist.distrito,
          electores: rndInt(150, 350),
          status: 0,
          personeroId: null,
        });
        mesaCounter++;
      }
    }
  }

  // Insert in batches
  for (let i = 0; i < mesaDocs.length; i += 500) {
    await Mesa.insertMany(mesaDocs.slice(i, i + 500));
  }
  console.log(`✅ ${mesaDocs.length} mesas creadas`);

  // Create some personeros (unassigned, voting at specific mesas)
  console.log('Creando personeros...');
  const personeroDocs = [];
  const firstFewMesas = mesaDocs.slice(0, 30); // simulate some who vote there

  for (let i = 0; i < 50; i++) {
    const mesa = firstFewMesas[i % firstFewMesas.length];
    personeroDocs.push({
      dni: dniRnd(),
      nombres: rnd(FIRST_NAMES),
      apellidoPaterno: rnd(LAST_NAMES_P),
      apellidoMaterno: rnd(LAST_NAMES_M),
      telefono: '9' + String(rndInt(10000000, 99999999)),
      correo: '',
      ubigeo: mesa.ubigeo,
      ubigeoVotacion: mesa.ubigeo,
      idLocalVotacion: mesa.idLocal,
      mesaVotacion: mesa.mesa,
      region: mesa.departamento,
      provincia: mesa.provincia,
      distrito: mesa.distrito,
      afiliado: Math.random() > 0.5,
      experienciaPrevia: Math.random() > 0.7,
      assignmentStatus: 'pendiente',
      source: 'import',
      active: true,
    });
  }

  // Avoid duplicate DNIs
  const seen = new Set();
  const uniquePersoneros = personeroDocs.filter(p => {
    if (seen.has(p.dni)) return false;
    seen.add(p.dni);
    return true;
  });

  await Personero.insertMany(uniquePersoneros);
  console.log(`✅ ${uniquePersoneros.length} personeros creados`);

  // Assign some mesas to show coverage
  console.log('Asignando personeros a mesas...');
  let assigned = 0;
  for (let i = 0; i < Math.min(uniquePersoneros.length, mesaDocs.length); i += 3) {
    const p = await Personero.findOne({ dni: uniquePersoneros[i].dni });
    const m = await Mesa.findOne({ mesa: mesaDocs[i].mesa });
    if (!p || !m || m.status > 0) continue;
    const now = new Date();
    p.assignmentStatus = i % 5 === 0 ? 'confirmado' : 'asignado';
    p.assignedMesa = m.mesa;
    p.assignedAt = now;
    if (i % 5 === 0) p.confirmedAt = now;
    await p.save();
    m.status = i % 5 === 0 ? 2 : 1;
    m.personeroId = p._id;
    m.assignedAt = now;
    if (i % 5 === 0) m.confirmedAt = now;
    await m.save();
    assigned++;
  }

  console.log(`✅ ${assigned} asignaciones realizadas`);

  const totalMesas = await Mesa.countDocuments();
  const totalPersoneros = await Personero.countDocuments();
  const asignadas = await Mesa.countDocuments({ status: { $gte: 1 } });

  console.log('\n=== RESUMEN ===');
  console.log(`Mesas: ${totalMesas}`);
  console.log(`Asignadas: ${asignadas} (${Math.round(asignadas/totalMesas*100)}%)`);
  console.log(`Personeros: ${totalPersoneros}`);
  console.log('\n✅ Demo data ready!');
  console.log('Login: admin@personeros.pe / admin123');

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

/**
 * import-party-data.js
 *
 * Importa los datos reales del partido desde CSV a MongoDB.
 * - mesas      → colección 'mesas'     (nombres de campo del partido + extras nuestros)
 * - personeros → colección 'personeros' (nombres de campo del partido + extras nuestros)
 * - ubicaciones→ colección 'ubicaciones'(nombres de campo del partido)
 * - usuarios   → NO se importa (creamos los nuestros con seed-usuarios.js)
 *
 * Run: node src/scripts/import-party-data.js
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { connectDB } from '../config/db.js';
import Mesa from '../models/Mesa.js';
import Personero from '../models/Personero.js';
import Ubicacion from '../models/Ubicacion.js';
import mongoose from 'mongoose';

// Ruta a los CSVs — configurable por variable de entorno para deploy en VPS
const CSV_DIR = process.env.CSV_DIR || 'C:/Users/Acer2025/Tema polìtico/mongo';

function readCsv(filename) {
  const filepath = path.join(CSV_DIR, filename);
  const content = fs.readFileSync(filepath, 'utf8');
  return parse(content, {
    columns: true,        // usa primera fila como header
    skip_empty_lines: true,
    bom: true,            // maneja BOM de Excel
    relax_quotes: true,
    relax_column_count: true,
  });
}

async function importMesas() {
  console.log('\n📋 Importando mesas...');
  const rows = readCsv('mesas.csv');
  console.log(`   Leídas ${rows.length} filas del CSV`);

  // Mapeo: renombrar campos con espacios + agregar campos nuestros
  const docs = rows.map(r => ({
    // Campos del partido (exactos, incluido typo DEPARTAMETO)
    UBIGEO:       (r['UBIGEO']        || '').trim(),
    MESA:         (r['MESA']          || '').trim(),
    ID_LOCAL:     (r['ID LOCAL']      || '').trim(),   // "ID LOCAL" → ID_LOCAL
    NOMBRE_LOCAL: (r['NOMBRE LOCAL']  || '').trim(),   // "NOMBRE LOCAL" → NOMBRE_LOCAL
    DEPARTAMETO:  (r['DEPARTAMETO']   || '').trim(),   // mantener el typo
    PROVINCIA:    (r['PROVINCIA']     || '').trim(),
    DISTRITO:     (r['DISTRITO']      || '').trim(),
    DIRECCION:    (r['DIRECCION']     || '').trim(),
    ELECTORES:    (r['ELECTORES']     || '0').trim(),  // string en su BD
    tipoUbicacion:(r['tipoUbicacion'] || '').trim(),
    // Campos que agregamos nosotros
    status:       0,        // 0=sin personero, 1=asignado, 2=confirmado
    personeroId:  null,
    assignedAt:   null,
    confirmedAt:  null,
  })).filter(d => d.MESA && d.UBIGEO); // descartar filas vacías

  // Borrar colección existente
  await Mesa.deleteMany({});
  console.log('   Colección mesas limpiada');

  // Insertar en lotes de 500
  let inserted = 0;
  for (let i = 0; i < docs.length; i += 500) {
    await Mesa.insertMany(docs.slice(i, i + 500), { ordered: false });
    inserted += Math.min(500, docs.length - i);
    process.stdout.write(`   ${inserted}/${docs.length} mesas...\r`);
  }
  console.log(`\n   ✅ ${inserted} mesas importadas`);
}

async function importPersoneros() {
  console.log('\n👤 Importando personeros...');
  const rows = readCsv('personeros.csv');
  console.log(`   Leídas ${rows.length} filas del CSV`);

  const docs = rows.map(r => ({
    // Campos del partido (exactos)
    dni:                    (r['dni']                    || '').trim(),
    nombres:                (r['nombres']                || '').trim(),
    apellidoPaterno:        (r['apellidoPaterno']        || '').trim(),
    apellidoMaterno:        (r['apellidoMaterno']        || '').trim(),
    correo:                 (r['correo']                 || '').trim(),
    telefono:               (r['telefono']               || '').trim(),
    afiliado:               (r['afiliado']               || 'false').trim(),  // string "true"/"false"
    experienciaPrevia:      (r['experienciaPrevia']      || 'false').trim(),  // string "true"/"false"
    descripcionExperiencia: (r['descripcionExperiencia'] || '').trim(),
    grupoVotacion:          (r['grupoVotacion']          || '').trim(),
    nivel1:                 (r['nivel1']                 || '').trim(),  // región/departamento
    nivel2:                 (r['nivel2']                 || '').trim(),  // provincia
    nivel3:                 (r['nivel3']                 || '').trim(),  // distrito
    referente:              (r['referente']              || '').trim(),
    tipoUbicacion:          (r['tipoUbicacion']          || '').trim(),
    // Campos que agregamos nosotros
    assignmentStatus:       'pendiente',
    assignedMesa:           null,
    assignedLocalId:        null,
    assignedUbigeo:         null,
    assignedAt:             null,
    confirmedAt:            null,
    source:                 'import',
    active:                 true,
  })).filter(d => d.dni); // descartar filas sin DNI

  // Deduplicar por DNI (quedarse con el último)
  const byDni = {};
  docs.forEach(d => { byDni[d.dni] = d; });
  const unique = Object.values(byDni);
  console.log(`   ${unique.length} personeros únicos (de ${docs.length} filas)`);

  await Personero.deleteMany({});
  console.log('   Colección personeros limpiada');

  await Personero.insertMany(unique, { ordered: false });
  console.log(`   ✅ ${unique.length} personeros importados`);
}

async function importUbicaciones() {
  console.log('\n🗺️  Importando ubicaciones...');
  const rows = readCsv('ubicaciones.csv');
  console.log(`   Leídas ${rows.length} filas del CSV`);

  const docs = rows.map(r => ({
    nivel1:        (r['nivel1']        || '').trim(),
    nivel2:        (r['nivel2']        || '').trim(),
    nivel3:        (r['nivel3']        || '').trim(),
    tipoUbicacion: (r['tipoUbicacion'] || '').trim(),
  })).filter(d => d.nivel1);

  await Ubicacion.deleteMany({});
  console.log('   Colección ubicaciones limpiada');

  await Ubicacion.insertMany(docs, { ordered: false });
  console.log(`   ✅ ${docs.length} ubicaciones importadas`);
}

async function main() {
  console.log('🚀 Iniciando importación de datos del partido...\n');
  await connectDB();

  await importMesas();
  await importPersoneros();
  await importUbicaciones();

  // Crear índices
  console.log('\n📇 Creando índices...');
  await Mesa.collection.createIndex({ UBIGEO: 1, status: 1 });
  await Mesa.collection.createIndex({ UBIGEO: 1, ID_LOCAL: 1 });
  await Mesa.collection.createIndex({ DEPARTAMETO: 1 });
  await Mesa.collection.createIndex({ MESA: 1 }, { unique: true });
  await Personero.collection.createIndex({ dni: 1 }, { unique: true });
  await Personero.collection.createIndex({ nivel1: 1, nivel2: 1, nivel3: 1 });
  await Personero.collection.createIndex({ assignmentStatus: 1 });
  await Ubicacion.collection.createIndex({ nivel1: 1, nivel2: 1, nivel3: 1 });
  console.log('   ✅ Índices creados');

  // Resumen final
  const [totalMesas, totalPersoneros, totalUbicaciones] = await Promise.all([
    Mesa.countDocuments(),
    Personero.countDocuments(),
    Ubicacion.countDocuments(),
  ]);

  console.log('\n═══════════════════════════════');
  console.log('         RESUMEN FINAL         ');
  console.log('═══════════════════════════════');
  console.log(`Mesas:       ${totalMesas.toLocaleString()}`);
  console.log(`Personeros:  ${totalPersoneros.toLocaleString()}`);
  console.log(`Ubicaciones: ${totalUbicaciones.toLocaleString()}`);
  console.log('\n✅ Importación completada!');
  console.log('   Ahora ejecuta: node src/scripts/seed-usuarios.js');

  await mongoose.disconnect();
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });

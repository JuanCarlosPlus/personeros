/**
 * seed-usuarios.js
 *
 * Crea los usuarios del sistema en la colección 'usuarios' con el esquema del partido.
 * NO importa los usuarios del partido — crea los nuestros.
 *
 * Run: node src/scripts/seed-usuarios.js
 */
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

const USUARIOS = [
  {
    username:             'administrador',
    password:             'admin2026',
    roles:                ['ROLE_ADMIN'],
    nombre:               'Administrador del Sistema',
    email:                'admin@personeros.pe',
    jurisdiccion:         '',
    jurisdiccionDistrito: '',
  },
  {
    username:             'gestion',
    password:             'gestion2026',
    roles:                ['ROLE_GESTION'],
    nombre:               'Responsable de Gestión',
    email:                'gestion@personeros.pe',
    jurisdiccion:         '',
    jurisdiccionDistrito: '',
  },
  {
    username:             'coordinador_lima',
    password:             'coord2026',
    roles:                ['ROLE_COORDINADOR'],
    nombre:               'Coordinador Lima',
    email:                'coord.lima@personeros.pe',
    jurisdiccion:         'Lima',
    jurisdiccionDistrito: '',
  },
  {
    username:             'coordinador_arequipa',
    password:             'coord2026',
    roles:                ['ROLE_COORDINADOR'],
    nombre:               'Coordinador Arequipa',
    email:                'coord.arequipa@personeros.pe',
    jurisdiccion:         'Arequipa',
    jurisdiccionDistrito: '',
  },
];

async function main() {
  console.log('👤 Creando usuarios del sistema...\n');
  await connectDB();

  // Limpiar usuarios existentes
  await User.deleteMany({});
  console.log('   Colección usuarios limpiada');

  for (const u of USUARIOS) {
    const hashed = await bcrypt.hash(u.password, 12);
    await User.create({ ...u, password: hashed, active: true });
    console.log(`   ✅ ${u.username} (${u.roles.join(', ')}) — pwd: ${u.password}`);
  }

  console.log('\n═══════════════════════════════');
  console.log('     CREDENCIALES DE ACCESO    ');
  console.log('═══════════════════════════════');
  USUARIOS.forEach(u => {
    console.log(`  ${u.username.padEnd(25)} / ${u.password}`);
  });
  console.log('\n✅ Usuarios creados. Sistema listo!');

  await mongoose.disconnect();
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });

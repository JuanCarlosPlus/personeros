/**
 * DNI Lookup Service
 *
 * In production this should call a real RENIEC API or a trusted third-party.
 * For now we simulate the lookup with realistic mock data so the UI
 * can be fully developed and tested.
 *
 * To integrate a real API: replace `lookupDni` body with the actual HTTP call.
 */

// Mock RENIEC database (for development/testing)
const MOCK_DB = {
  '12345678': {
    nombres: 'JUAN CARLOS',
    apellidoPaterno: 'GARCIA',
    apellidoMaterno: 'LOPEZ',
    fechaNacimiento: '1985-03-15',
    direccion: 'AV. AREQUIPA 1234, LIMA, LIMA',
    ubigeo: '150101',
  },
  '87654321': {
    nombres: 'MARIA ELENA',
    apellidoPaterno: 'RODRIGUEZ',
    apellidoMaterno: 'FLORES',
    fechaNacimiento: '1990-07-22',
    direccion: 'JR. UNION 567, LIMA, LIMA',
    ubigeo: '150101',
  },
  '45678901': {
    nombres: 'PEDRO ANTONIO',
    apellidoPaterno: 'MENDOZA',
    apellidoMaterno: 'RAMIREZ',
    fechaNacimiento: '1978-11-08',
    direccion: 'AV. BRASIL 890, LIMA, LIMA',
    ubigeo: '150101',
  },
};

export async function lookupDni(dni) {
  // --- Real API integration point ---
  // const response = await fetch(`https://api.reniec.example.pe/dni/${dni}`, {
  //   headers: { 'Authorization': `Bearer ${process.env.RENIEC_API_TOKEN}` }
  // });
  // if (!response.ok) return null;
  // return response.json();
  // ----------------------------------

  // Mock: simulate network delay
  await new Promise(r => setTimeout(r, 200));

  const data = MOCK_DB[dni];
  if (!data) {
    // For any unknown DNI in dev, generate plausible fake data
    // so the form can always be tested
    return {
      nombres: 'NOMBRE',
      apellidoPaterno: 'APELLIDO',
      apellidoMaterno: 'PATERNO',
      fechaNacimiento: '1990-01-01',
      direccion: `CALLE EXAMPLE 123, LIMA`,
      ubigeo: '150101',
      source: 'mock',
    };
  }

  return { ...data, source: 'mock' };
}

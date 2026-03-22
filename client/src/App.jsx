import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginForm from './components/auth/LoginForm';
import RegionGrid from './components/dashboard/RegionGrid';
import ProvinceGrid from './components/dashboard/ProvinceGrid';
import DistrictGrid from './components/dashboard/DistrictGrid';
import CentroGrid from './components/dashboard/CentroGrid';
import MesaPanel from './components/dashboard/MesaPanel';
import PersoneroList from './components/dashboard/PersoneroList';
import RegistroMasivo from './components/dashboard/RegistroMasivo';
import CargosView from './components/admin/CargosView';
import DirectivosView from './components/admin/DirectivosView';
import JefesLocalView from './components/admin/JefesLocalView';
import ReportesView from './components/admin/ReportesView';
import DirectivoLogin from './components/directivo/DirectivoLogin';
import DirectivoDashboard from './components/directivo/DirectivoDashboard';
import InvitarPersoneros from './components/directivo/InvitarPersoneros';
import AutoRegistro from './components/registration/AutoRegistro';
import PersoneroLogin from './components/personero/PersoneroLogin';
import PersoneroDashboard from './components/personero/PersoneroDashboard';
import JefeLocalLogin from './components/jefe-local/JefeLocalLogin';
import JefeLocalDashboard from './components/jefe-local/JefeLocalDashboard';
import ChatView from './components/chat/ChatView';

function Protected({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginForm />} />
          <Route path="/directivo/login" element={<DirectivoLogin />} />
          <Route path="/personero/login" element={<PersoneroLogin />} />
          <Route path="/jefe-local/login" element={<JefeLocalLogin />} />
          <Route path="/registro/:linkCode" element={<AutoRegistro />} />

          {/* Admin — Drill-down */}
          <Route path="/" element={<Protected><RegionGrid /></Protected>} />
          <Route path="/dept/:deptCode" element={<Protected><ProvinceGrid /></Protected>} />
          <Route path="/prov/:provCode" element={<Protected><DistrictGrid /></Protected>} />
          <Route path="/dist/:ubigeo" element={<Protected><CentroGrid /></Protected>} />
          <Route path="/centro/:ubigeo/:idLocal" element={<Protected><MesaPanel /></Protected>} />

          {/* Admin — Personeros */}
          <Route path="/personeros" element={<Protected><PersoneroList /></Protected>} />
          <Route path="/personeros/registro-masivo" element={<Protected><RegistroMasivo /></Protected>} />

          {/* Admin — Config */}
          <Route path="/admin/cargos" element={<Protected><CargosView /></Protected>} />
          <Route path="/admin/directivos" element={<Protected><DirectivosView /></Protected>} />
          <Route path="/admin/jefes-local" element={<Protected><JefesLocalView /></Protected>} />
          <Route path="/admin/reportes" element={<Protected><ReportesView /></Protected>} />
          <Route path="/admin/chat" element={<Protected><ChatView /></Protected>} />

          {/* Portal Directivo */}
          <Route path="/directivo/dashboard" element={<DirectivoDashboard />} />
          <Route path="/directivo/invitar" element={<InvitarPersoneros />} />

          {/* Portal Personero */}
          <Route path="/personero/dashboard" element={<PersoneroDashboard />} />

          {/* Portal Jefe de Local */}
          <Route path="/jefe-local/dashboard" element={<JefeLocalDashboard />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

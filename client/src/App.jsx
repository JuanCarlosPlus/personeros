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

          {/* Drill-down */}
          <Route path="/" element={<Protected><RegionGrid /></Protected>} />
          <Route path="/dept/:deptCode" element={<Protected><ProvinceGrid /></Protected>} />
          <Route path="/prov/:provCode" element={<Protected><DistrictGrid /></Protected>} />
          <Route path="/dist/:ubigeo" element={<Protected><CentroGrid /></Protected>} />
          <Route path="/centro/:ubigeo/:idLocal" element={<Protected><MesaPanel /></Protected>} />

          {/* Personeros list */}
          <Route path="/personeros" element={<Protected><PersoneroList /></Protected>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

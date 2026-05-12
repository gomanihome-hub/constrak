import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useRoles } from './context/RolesContext';
import SplashScreen from './components/SplashScreen';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import Workers from './pages/Workers';
import Materials from './pages/Materials';
import WorkLog from './pages/WorkLog';
import AdminPanel from './pages/AdminPanel';
import CheckIn from './pages/CheckIn';
import MyReport from './pages/MyReport';
import Messages from './pages/Messages';
import Megaphone from './pages/Megaphone';
import Chat from './pages/Chat';
import Safety from './pages/Safety';
import './index.css';

const FULL_PAGES = {
  dashboard: Dashboard,
  projects:  Projects,
  tasks:     Tasks,
  workers:   Workers,
  materials: Materials,
  worklog:   WorkLog,
  messages:  Messages,
  megaphone: Megaphone,
  chat:      Chat,
  safety:    Safety,
  admin:     AdminPanel,
};

export default function App() {
  const { user, authLoading } = useAuth();
  const { currentRole, can } = useRoles();
  const [splashDone, setSplashDone] = useState(false);
  const [authPage, setAuthPage] = useState('login');
  const [activePage, setActivePage] = useState('dashboard');

  if (!splashDone) return <SplashScreen onDone={() => setSplashDone(true)} />;

  if (authLoading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(160deg, #4fb8e0, #80cded)' }}>
        <div style={{ width:48, height:48, border:'4px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    if (authPage === 'register') {
      return <RegisterPage onLogin={() => setAuthPage('login')} onRegistered={() => {}} />;
    }
    return <LoginPage onLogin={() => {}} onRegister={() => setAuthPage('register')} />;
  }

  // Worker: dedicated check-in view
  if (currentRole === 'worker') {
    return <CheckIn />;
  }

  // Subcontractor: dedicated report view
  if (currentRole === 'subcontractor') {
    return <MyReport />;
  }

  // Full app for admin / project_manager / site_manager
  const PageComponent = FULL_PAGES[activePage] ?? Dashboard;
  return (
    <div className="flex min-h-screen bg-slate-50" dir="rtl">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header activePage={activePage} />
        <main className="flex-1 overflow-auto">
          <PageComponent />
        </main>
      </div>
    </div>
  );
}

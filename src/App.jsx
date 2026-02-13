import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import CreateEvent from './pages/CreateEvent';
import EventDetails from './pages/EventDetails';
import CreateQueue from './pages/CreateQueue';
import ManageQueue from './pages/ManageQueue';
import ClientJoin from './pages/ClientJoin';
import ArtistProfile from './pages/ArtistProfile';
import CustomerView from './pages/CustomerView';
import DisplayScreen from './pages/DisplayScreen';
import FindTurn from './pages/FindTurn';
import Kiosk from './pages/Kiosk';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/" />;
}

// Public Route (redirect if logged in)
function PublicRoute({ children }) {
  const { currentUser } = useAuth();
  return !currentUser ? children : <Navigate to="/dashboard" />;
}

function App() {
  return (
    <AuthProvider>
      <Router basename='/artistline'>
        <Toaster position="top-center" />
        <Routes>
          <Route path="/artistline/kiosk/:eventId" element={<Kiosk />} />
          <Route path="/artistline/kiosk/:eventId/:queueId" element={<Kiosk />} />
          <Route path="/artistline/event/:eventId/find" element={<FindTurn />} />
          <Route path="/artistline/display/:eventId" element={<DisplayScreen />} />
          <Route path="/artistline/customer/:customerId" element={<CustomerView />} />
          <Route path="/artistline/artist/:username" element={<ArtistProfile />} />
          <Route path="/artistline/join/:eventId" element={<ClientJoin />} />
          <Route path="/artistline/queue/:queueId/manage" element={
            <ProtectedRoute>
              <ManageQueue />
            </ProtectedRoute>
          } />
          <Route path="/artistline/event/:eventId/create-queue" element={
            <ProtectedRoute>
              <CreateQueue />
            </ProtectedRoute>
        } />
          <Route path="/artistline/event/:eventId" element={
            <ProtectedRoute>
              <EventDetails />
            </ProtectedRoute>
        } />
          <Route path="/artistline/" element={
            <PublicRoute>
              <Auth />
            </PublicRoute>
          } />
          <Route path="/artistline/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/artistline/create-event" element={
            <ProtectedRoute>
              <CreateEvent />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
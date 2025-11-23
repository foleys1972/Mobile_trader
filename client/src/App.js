import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from 'styled-components';
import { GlobalStyle, theme } from './styles/GlobalStyle';
import { useAuthStore } from './stores/authStore';
import { useWebRTCStore } from './stores/webrtcStore';

// Components
import Layout from './components/Layout/Layout';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Intercom from './pages/Intercom/Intercom';
import Admin from './pages/Admin/Admin';
import Recordings from './pages/Recordings/Recordings';
import Federation from './pages/Federation/Federation';
import Settings from './pages/Settings/Settings';

// Hooks
import { useWebRTC } from './hooks/useWebRTC';
import { useSocket } from './hooks/useSocket';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

function App() {
  const { isAuthenticated, user } = useAuthStore();
  const { initializeWebRTC } = useWebRTCStore();
  const { connectSocket, disconnectSocket } = useSocket();
  const { initializeMediaSoup } = useWebRTC();

  React.useEffect(() => {
    if (isAuthenticated) {
      // Initialize WebRTC and socket connection
      initializeMediaSoup();
      connectSocket();
      
      return () => {
        disconnectSocket();
      };
    }
  }, [isAuthenticated, initializeMediaSoup, connectSocket, disconnectSocket]);

  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <Login />
        <Toaster position="top-right" />
      </ThemeProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/intercom/:groupId" element={<Intercom />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/recordings" element={<Recordings />} />
              <Route path="/federation" element={<Federation />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        </Router>
        <Toaster position="top-right" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

import { Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import PlansPage from './pages/PlansPage';
import ChatPage from './pages/ChatPage';
import NotFoundPage from './pages/NotFoundPage';
import { PlanProvider } from './hooks/usePlanContext';
import './App.css';

// For now, we'll use a hardcoded user ID
// In a real app, this would come from authentication
const CURRENT_USER_ID = 'demo-user';

function App() {
  return (
    <ErrorBoundary>
      <PlanProvider userId={CURRENT_USER_ID}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<PlansPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </PlanProvider>
    </ErrorBoundary>
  );
}

export default App;

// Ana App komponenti - React Router ile sayfa yönlendirmelerini yönetir
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import AlertsPage from './pages/data/AlertsPage';
import ResourceDetailPage from './pages/ResourceDetailPage';

function App() {
  return (
    <BrowserRouter>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/data/alerts" element={<AlertsPage />} />
          <Route path="/resources/:resourceId" element={<ResourceDetailPage />} />
        </Routes>
    </BrowserRouter>
  );
}

export default App;


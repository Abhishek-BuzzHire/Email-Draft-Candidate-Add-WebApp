import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './context/AppContext';
import Navbar from './components/layout/Navbar';
import CandidateForm from './pages/CandidateForm';
import RecipientSelection from './pages/RecipientSelection';
import EmailPreview from './pages/EmailPreview';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <AppProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/add-candidate" element={<CandidateForm />} />
              <Route path="/recipient-selection/:id" element={<RecipientSelection />} />
              <Route path="/email-preview/:id" element={<EmailPreview />} />
            </Routes>
          </div>
          <Toaster position="top-right" />
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;
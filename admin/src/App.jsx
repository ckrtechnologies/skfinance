import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import LoansList from './pages/Loans/LoansList';
import LoanDetail from './pages/Loans/LoanDetail';
import LendersList from './pages/Lenders/LendersList';
import PolicyBuilder from './pages/Lenders/PolicyBuilder';
import DealersList from './pages/Dealers/DealersList';
import StaffList from './pages/Staff/StaffList';
import Settings from './pages/Settings/Settings';
import Financials from './pages/Financials/Financials';
import AuditLog from './pages/AuditLog/AuditLog';
import Login from './pages/Login/Login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="loans">
            <Route index element={<LoansList />} />
            <Route path=":id" element={<LoanDetail />} />
          </Route>
          <Route path="lenders">
            <Route index element={<LendersList />} />
            <Route path=":id/policies" element={<PolicyBuilder />} />
          </Route>
          <Route path="dealers" element={<DealersList />} />
          <Route path="staff" element={<StaffList />} />
          <Route path="financials" element={<Financials />} />
          <Route path="settings" element={<Settings />} />
          <Route path="audit-log" element={<AuditLog />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

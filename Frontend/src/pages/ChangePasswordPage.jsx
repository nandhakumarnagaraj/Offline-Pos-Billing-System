import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../service/api';
import './ChangePasswordPage.css';

function ChangePasswordPage() {
  const { user, logout, updateMustChangePassword, getToken } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentPassword || !newPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword.length < 4) {
      setError('New password must be at least 4 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password',
        { currentPassword: currentPassword, newPassword: newPassword },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      updateMustChangePassword(false);
      alert('✅ Password changed successfully!');

      // Redirect based on role
      const role = user?.role;
      if (role === 'WAITER') {
        navigate('/waiter');
      } else if (role === 'KITCHEN') {
        navigate('/kitchen');
      } else if (role === 'CASHIER') {
        navigate('/counter');
      } else if (role === 'MANAGER' || role === 'ADMIN') {
        navigate('/manager');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    }
    setLoading(false);
  };

  return (
    <div className="cp-container">
      <div className="cp-card animate-fadeIn">
        <div className="cp-header">
          <div className="cp-icon">🔑</div>
          <h1>Set Your Password</h1>
          <p>Welcome <strong>{user?.displayName}</strong>! Please set a new password to continue.</p>
        </div>

        <form className="cp-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="currentPwd">Current Password</label>
            <input
              id="currentPwd"
              className="input"
              type="password"
              placeholder="Enter your default password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              autoFocus
            />
            <span className="form-hint">Default password is: <code>welcome123</code></span>
          </div>

          <div className="form-group">
            <label htmlFor="newPwd">New Password</label>
            <input
              id="newPwd"
              className="input"
              type="password"
              placeholder="Choose a new password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPwd">Confirm New Password</label>
            <input
              id="confirmPwd"
              className="input"
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && <div className="cp-error">{error}</div>}

          <button className="btn btn-primary btn-lg cp-btn" type="submit" disabled={loading}>
            {loading ? '⏳ Saving...' : '✅ Set Password & Continue'}
          </button>
        </form>

        <button className="btn btn-outline cp-logout" onClick={logout}>
          ← Sign out and use a different account
        </button>
      </div>
    </div>
  );
}

export default ChangePasswordPage;

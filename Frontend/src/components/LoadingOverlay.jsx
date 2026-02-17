import React from 'react';
import './loading.css';

const LoadingOverlay = ({ message = 'Processing...' }) => {
  return (
    <div className="loading-overlay">
      <div className="spinner"></div>
      <p className="loading-text">{message}</p>
    </div>
  );
};

export default LoadingOverlay;

import React from 'react';

const LoadingSpinner = ({ size = 'medium', text = 'Loading...' }) => {
  const sizeClasses = {
    small: 'spinner-border-sm',
    medium: '',
    large: 'spinner-border-lg'
  };

  return (
    <div className="d-flex flex-column align-items-center">
      <div 
        className={`spinner-border text-primary ${sizeClasses[size]}`} 
        role="status"
        aria-hidden="true"
      >
        <span className="visually-hidden">Loading...</span>
      </div>
      {text && (
        <div className="mt-2 text-muted">
          {text}
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner; 
import React from 'react';
import './Loading.css';

interface LoadingProps {
  message?: string;
}

const Loading: React.FC<LoadingProps> = ({ message = '로딩 중...' }) => {
  return (
    <div className="loading">
      <div className="loading-spinner" />
      <p className="loading-message">{message}</p>
    </div>
  );
};

export default Loading;

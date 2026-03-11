import React from 'react';
import './ErrorMessage.css';

interface ErrorMessageProps {
  message?: string;
  onRetry?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message = '오류가 발생했습니다. 다시 시도해 주세요.',
  onRetry,
}) => {
  return (
    <div className="error-message">
      <p className="error-text">{message}</p>
      {onRetry && (
        <button className="btn btn-outline btn-sm" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;

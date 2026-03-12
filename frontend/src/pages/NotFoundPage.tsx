import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center',
      fontFamily: 'sans-serif',
    }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '0.5rem', color: '#4F46E5' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
        페이지를 찾을 수 없습니다
      </h2>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
      </p>
      <Link
        to="/"
        style={{
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          backgroundColor: '#4F46E5',
          color: '#fff',
          border: 'none',
          borderRadius: '0.5rem',
          textDecoration: 'none',
        }}
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
};

export default NotFoundPage;

import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { verifyEmail } from '../../api/subscribers';
import './VerifyEmailPage.css';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'already' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const calledRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('유효하지 않은 인증 링크입니다.');
      return;
    }

    if (calledRef.current) return;
    calledRef.current = true;

    verifyEmail(token)
      .then((res) => {
        setEmail(res.data.email);
        setMessage(res.data.message);
        if (res.data.message.includes('이미')) {
          setStatus('already');
        } else {
          setStatus('success');
        }
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || '인증 처리 중 오류가 발생했습니다.');
      });
  }, [token]);

  return (
    <div className="verify-page">
      <div className="verify-card">
        <div className="verify-logo">오늘을 만들었던 어제의 기술</div>

        {status === 'loading' && (
          <div className="verify-loading">
            <div className="spinner" />
            <p>인증 처리 중입니다...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="verify-result success">
            <div className="verify-icon">✓</div>
            <h2>인증 완료!</h2>
            {email && <p className="verify-email">{email}</p>}
            <p className="verify-message">{message}</p>
            <Link to="/" className="btn btn-highlight">홈으로 돌아가기</Link>
          </div>
        )}

        {status === 'already' && (
          <div className="verify-result already">
            <div className="verify-icon">✓</div>
            <h2>이미 인증됨</h2>
            {email && <p className="verify-email">{email}</p>}
            <p className="verify-message">{message}</p>
            <Link to="/" className="btn btn-highlight">홈으로 돌아가기</Link>
          </div>
        )}

        {status === 'error' && (
          <div className="verify-result error">
            <div className="verify-icon">✕</div>
            <h2>인증 실패</h2>
            <p className="verify-message">{message}</p>
            <Link to="/" className="btn btn-highlight">홈으로 돌아가기</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;

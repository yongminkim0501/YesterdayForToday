import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { subscribe } from '../../api/subscribers';
import './SubscriptionForm.css';

const SubscriptionForm = React.forwardRef<HTMLDivElement>((_, ref) => {
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      setStatus('error');
      setMessage('올바른 이메일 주소를 입력해 주세요.');
      return;
    }

    if (!agreed) {
      setStatus('error');
      setMessage('개인정보처리방침에 동의해 주세요.');
      return;
    }

    setStatus('loading');
    try {
      await subscribe(email);
      setStatus('success');
      setMessage('인증 이메일을 발송했습니다! 이메일을 확인하여 구독을 완료해 주세요.');
      setEmail('');
    } catch (error: any) {
      setStatus('error');
      const msg = error.response?.data?.message || '구독 신청 중 오류가 발생했습니다. 다시 시도해 주세요.';
      setMessage(msg);
    }
  };

  return (
    <section className="subscription-section" ref={ref}>
      <div className="container">
        <div className="subscription-card">
          <h2 className="subscription-title">뉴스레터 구독하기</h2>
          <p className="subscription-desc">
            이메일 주소를 입력하시면 매일 아침 6시에 기술 블로그 요약을 보내드립니다.
          </p>
          <form className="subscription-form" onSubmit={handleSubmit}>
            <input
              type="email"
              className="subscription-input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status !== 'idle') setStatus('idle');
              }}
              disabled={status === 'loading'}
            />
            <button
              type="submit"
              className="btn btn-highlight btn-lg"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? '처리 중...' : '구독하기'}
            </button>
          </form>
          <label className="subscription-agree">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>
              <Link to="/privacy" target="_blank" className="privacy-link">
                개인정보처리방침
              </Link>
              에 동의합니다.
            </span>
          </label>
          {message && (
            <p className={`subscription-message ${status}`}>{message}</p>
          )}
        </div>
      </div>
    </section>
  );
});

SubscriptionForm.displayName = 'SubscriptionForm';

export default SubscriptionForm;

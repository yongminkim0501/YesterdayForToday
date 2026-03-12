import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subscribe } from '../../api/subscribers';
import './SubscriptionForm.css';

const COOLDOWN_MS = 30000; // 30초 쿨다운

const SubscriptionForm = React.forwardRef<HTMLDivElement>((_, ref) => {
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
      }
    };
  }, []);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const startCooldown = () => {
    setCooldown(COOLDOWN_MS / 1000);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetEmail = sentEmail || email;

    if (!validateEmail(targetEmail)) {
      setStatus('error');
      setMessage('올바른 이메일 주소를 입력해 주세요.');
      return;
    }

    if (!agreed) {
      setStatus('error');
      setMessage('개인정보처리방침에 동의해 주세요.');
      return;
    }

    if (cooldown > 0) return;

    setStatus('loading');
    try {
      await subscribe(targetEmail);
      setStatus('success');
      setSentEmail(targetEmail);
      setMessage('');
      setEmail('');
      startCooldown();
    } catch (error: any) {
      setStatus('error');
      const msg = error.response?.data?.message || '구독 신청 중 오류가 발생했습니다. 다시 시도해 주세요.';
      setMessage(msg);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !sentEmail) return;
    setStatus('loading');
    try {
      await subscribe(sentEmail);
      setStatus('success');
      setMessage('인증 이메일을 다시 발송했습니다!');
      startCooldown();
    } catch (error: any) {
      setStatus('error');
      const msg = error.response?.data?.message || '재발송 중 오류가 발생했습니다.';
      setMessage(msg);
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setSentEmail('');
    setMessage('');
    setEmail('');
    setCooldown(0);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
  };

  if (status === 'success') {
    return (
      <section className="subscription-section" ref={ref}>
        <div className="container">
          <div className="subscription-card">
            <div className="success-icon">✉️</div>
            <h2 className="subscription-title">이메일을 확인해 주세요!</h2>
            <p className="subscription-desc">
              <strong>{sentEmail}</strong>으로 인증 이메일을 발송했습니다.<br />
              메일함에서 <strong>구독 인증하기</strong> 버튼을 클릭하면 구독이 완료됩니다.
            </p>
            <p className="subscription-hint">
              이메일이 보이지 않으면 스팸함을 확인해 주세요.
            </p>
            <div className="success-actions">
              <button
                className="btn btn-resend"
                onClick={handleResend}
                disabled={cooldown > 0}
              >
                {cooldown > 0
                  ? `다시 보내기 (${cooldown}초)`
                  : '인증 이메일 다시 보내기'}
              </button>
              <button
                className="btn btn-text"
                onClick={handleReset}
              >
                다른 이메일로 구독하기
              </button>
            </div>
            {message && (
              <p className={`subscription-message ${status}`}>{message}</p>
            )}
          </div>
        </div>
      </section>
    );
  }

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
              {status === 'loading' ? (
                <span className="loading-content">
                  <span className="spinner" />
                  전송 중...
                </span>
              ) : (
                '구독하기'
              )}
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

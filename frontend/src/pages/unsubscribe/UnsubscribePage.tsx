import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { verifyUnsubscribeToken, unsubscribe } from '../../api/subscribers';
import Loading from '../../components/common/Loading';
import './UnsubscribePage.css';

type PageState = 'loading' | 'confirm' | 'success' | 'error';

const UnsubscribePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [state, setState] = useState<PageState>('loading');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMsg('유효하지 않은 링크입니다.');
      return;
    }

    const verify = async () => {
      try {
        const res = await verifyUnsubscribeToken(token);
        setEmail(res.data.email || '');
        setState('confirm');
      } catch {
        setState('error');
        setErrorMsg('유효하지 않거나 만료된 링크입니다.');
      }
    };
    verify();
  }, [token]);

  const handleUnsubscribe = async () => {
    setProcessing(true);
    try {
      await unsubscribe(token);
      setState('success');
    } catch {
      setState('error');
      setErrorMsg('구독 취소 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  if (state === 'loading') return <Loading message="확인 중..." />;

  return (
    <div className="unsubscribe-page">
      <div className="unsubscribe-card">
        {state === 'confirm' && (
          <>
            <h1 className="unsubscribe-title">구독 취소</h1>
            <p className="unsubscribe-desc">
              <strong>{email}</strong> 주소의 뉴스레터 구독을 취소하시겠습니까?
            </p>
            <p className="unsubscribe-note">
              구독을 취소하시면 더 이상 매일 아침 뉴스레터를 받지 않게 됩니다.
            </p>
            <div className="unsubscribe-actions">
              <Link to="/" className="btn btn-outline">
                돌아가기
              </Link>
              <button
                className="btn btn-danger"
                onClick={handleUnsubscribe}
                disabled={processing}
              >
                {processing ? '처리 중...' : '구독 취소'}
              </button>
            </div>
          </>
        )}

        {state === 'success' && (
          <>
            <h1 className="unsubscribe-title">구독이 취소되었습니다</h1>
            <p className="unsubscribe-desc">
              더 이상 뉴스레터를 보내지 않겠습니다.
            </p>
            <p className="unsubscribe-note">
              언제든 다시 구독하실 수 있습니다.
            </p>
            <Link to="/" className="btn btn-primary">
              홈으로 돌아가기
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <h1 className="unsubscribe-title">오류</h1>
            <p className="unsubscribe-desc">{errorMsg}</p>
            <Link to="/" className="btn btn-primary">
              홈으로 돌아가기
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default UnsubscribePage;

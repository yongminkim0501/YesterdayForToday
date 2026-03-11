import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getNewsletter, Newsletter } from '../../api/newsletters';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import './NewsletterDetailPage.css';

const companyBadgeClass = (company: string) => {
  const map: Record<string, string> = {
    Meta: 'badge-meta',
    Netflix: 'badge-netflix',
    Amazon: 'badge-amazon',
    Google: 'badge-google',
    Apple: 'badge-apple',
    Uber: 'badge-uber',
    LinkedIn: 'badge-linkedin',
    Spotify: 'badge-spotify',
  };
  return map[company] || '';
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
};

const NewsletterDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await getNewsletter(parseInt(id, 10));
      setNewsletter(res.data);
    } catch {
      setError('뉴스레터를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={fetchData} />;
  if (!newsletter) return <ErrorMessage message="뉴스레터를 찾을 수 없습니다." />;

  const prevId = newsletter.id > 1 ? newsletter.id - 1 : null;
  const nextId = newsletter.id + 1;

  return (
    <div className="newsletter-detail">
      <div className="container">
        <article className="newsletter-article">
          <header className="newsletter-header">
            <span className="newsletter-date">
              {formatDate(newsletter.published_at || newsletter.created_at)}
            </span>
            <h1 className="newsletter-title">{newsletter.title}</h1>
            {newsletter.companies && newsletter.companies.length > 0 && (
              <div className="newsletter-badges">
                {newsletter.companies.map((c) => (
                  <span key={c} className={`badge ${companyBadgeClass(c)}`}>{c}</span>
                ))}
              </div>
            )}
          </header>

          <div className="newsletter-content markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {newsletter.content}
            </ReactMarkdown>
          </div>

          <nav className="newsletter-nav">
            {prevId ? (
              <Link to={`/archive/${prevId}`} className="btn btn-outline">
                ← 이전 뉴스레터
              </Link>
            ) : (
              <span />
            )}
            <Link to="/archive" className="btn btn-outline">
              목록으로
            </Link>
            <Link to={`/archive/${nextId}`} className="btn btn-outline">
              다음 뉴스레터 →
            </Link>
          </nav>
        </article>

        <div className="newsletter-subscribe-banner">
          <h3>이 뉴스레터가 마음에 드셨나요?</h3>
          <p>매일 아침 6시, 빅테크 기술 블로그 요약을 받아보세요.</p>
          <Link to="/" className="btn btn-highlight">
            구독하기
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NewsletterDetailPage;

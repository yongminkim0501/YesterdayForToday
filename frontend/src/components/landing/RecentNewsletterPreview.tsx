import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getNewsletters, Newsletter } from '../../api/newsletters';
import './RecentNewsletterPreview.css';

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
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
};

const RecentNewsletterPreview: React.FC = () => {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getNewsletters({ page: 1, limit: 3 });
        setNewsletters(res.data.newsletters || []);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading || newsletters.length === 0) return null;

  return (
    <section className="recent-newsletters">
      <div className="container">
        <h2 className="section-title">최신 뉴스레터</h2>
        <div className="newsletter-preview-grid">
          {newsletters.map((nl) => (
            <Link to={`/archive/${nl.id}`} key={nl.id} className="newsletter-preview-card">
              <span className="newsletter-preview-date">
                {formatDate(nl.published_at || nl.created_at)}
              </span>
              <h3 className="newsletter-preview-title">{nl.title}</h3>
              {nl.companies && nl.companies.length > 0 && (
                <div className="newsletter-preview-badges">
                  {nl.companies.map((c) => (
                    <span key={c} className={`badge ${companyBadgeClass(c)}`}>{c}</span>
                  ))}
                </div>
              )}
              {nl.summary && (
                <p className="newsletter-preview-summary">{nl.summary}</p>
              )}
            </Link>
          ))}
        </div>
        <div className="newsletter-preview-more">
          <Link to="/archive" className="btn btn-outline">
            전체 아카이브 보기
          </Link>
        </div>
      </div>
    </section>
  );
};

export default RecentNewsletterPreview;

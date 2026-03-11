import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getNewsletters, Newsletter } from '../../api/newsletters';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import Pagination from '../../components/common/Pagination';
import './ArchivePage.css';

const COMPANIES = ['전체', 'Meta', 'Netflix', 'Amazon', 'Google', 'Apple', 'Uber', 'LinkedIn', 'Spotify'];

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

const ArchivePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const page = parseInt(searchParams.get('page') || '1', 10);
  const company = searchParams.get('company') || '';
  const keyword = searchParams.get('keyword') || '';

  const [searchInput, setSearchInput] = useState(keyword);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { page, limit: 9 };
      if (company && company !== '전체') params.company = company;
      if (keyword) params.keyword = keyword;
      const res = await getNewsletters(params);
      setNewsletters(res.data.newsletters || []);
      setTotalPages(res.data.totalPages || 1);
    } catch {
      setError('뉴스레터를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [page, company, keyword]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    if (updates.company !== undefined || updates.keyword !== undefined) {
      params.set('page', '1');
    }
    setSearchParams(params);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ keyword: searchInput });
  };

  return (
    <div className="archive-page">
      <div className="container">
        <div className="archive-header">
          <h1 className="archive-title">뉴스레터 아카이브</h1>
          <p className="archive-desc">지금까지 발행된 모든 뉴스레터를 확인하세요.</p>
        </div>

        <div className="archive-filters">
          <div className="company-tags">
            {COMPANIES.map((c) => (
              <button
                key={c}
                className={`company-tag ${(c === '전체' && !company) || company === c ? 'active' : ''}`}
                onClick={() => updateParams({ company: c === '전체' ? '' : c })}
              >
                {c}
              </button>
            ))}
          </div>
          <form className="archive-search" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="검색어를 입력하세요"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="archive-search-input"
            />
            <button type="submit" className="btn btn-primary btn-sm">
              검색
            </button>
          </form>
        </div>

        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorMessage message={error} onRetry={fetchData} />
        ) : newsletters.length === 0 ? (
          <div className="archive-empty">
            <p>검색 결과가 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="archive-grid">
              {newsletters.map((nl) => (
                <Link to={`/archive/${nl.id}`} key={nl.id} className="archive-card">
                  <span className="archive-card-date">
                    {formatDate(nl.published_at || nl.created_at)}
                  </span>
                  <h3 className="archive-card-title">{nl.title}</h3>
                  {nl.companies && nl.companies.length > 0 && (
                    <div className="archive-card-badges">
                      {nl.companies.map((c) => (
                        <span key={c} className={`badge ${companyBadgeClass(c)}`}>{c}</span>
                      ))}
                    </div>
                  )}
                  {nl.summary && (
                    <p className="archive-card-summary">{nl.summary}</p>
                  )}
                </Link>
              ))}
            </div>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => updateParams({ page: String(p) })}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ArchivePage;

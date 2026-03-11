import React, { useEffect, useState } from 'react';
import { getStats, AdminStats } from '../../api/auth';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import './AdminDashboardPage.css';

const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getStats();
      setStats(res.data);
    } catch {
      setError('통계를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={fetchStats} />;

  return (
    <div className="admin-dashboard">
      <h1 className="admin-page-title">대시보드</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">총 구독자</span>
          <span className="stat-value">{stats?.subscriberCount ?? 0}</span>
          <span className="stat-unit">명</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">발행된 뉴스레터</span>
          <span className="stat-value">{stats?.newsletterCount ?? 0}</span>
          <span className="stat-unit">개</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">등록된 포스트</span>
          <span className="stat-value">{stats?.postCount ?? 0}</span>
          <span className="stat-unit">개</span>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;

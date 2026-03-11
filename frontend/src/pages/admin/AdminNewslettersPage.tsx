import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  getAdminNewsletters,
  deleteNewsletter,
  sendNewsletter,
  Newsletter,
} from '../../api/newsletters';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import Pagination from '../../components/common/Pagination';
import './AdminNewslettersPage.css';

const AdminNewslettersPage: React.FC = () => {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminNewsletters({ page, limit: 10 });
      setNewsletters(res.data.newsletters || []);
      setTotalPages(res.data.totalPages || 1);
    } catch {
      setError('뉴스레터를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteNewsletter(id);
      fetchData();
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  const handleSend = async (id: number) => {
    if (!window.confirm('이 뉴스레터를 발송하시겠습니까?')) return;
    try {
      await sendNewsletter(id);
      alert('발송이 완료되었습니다.');
      fetchData();
    } catch {
      alert('발송에 실패했습니다.');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR');
  };

  const statusLabel = (status?: string) => {
    switch (status) {
      case 'sent': return '발송됨';
      case 'draft': return '초안';
      default: return status || '초안';
    }
  };

  return (
    <div className="admin-newsletters">
      <div className="admin-page-header">
        <h1 className="admin-page-title">뉴스레터 관리</h1>
        <Link to="/admin/newsletters/new" className="btn btn-primary">
          새 뉴스레터
        </Link>
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchData} />
      ) : (
        <>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>제목</th>
                  <th>상태</th>
                  <th>작성일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {newsletters.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="admin-table-empty">등록된 뉴스레터가 없습니다.</td>
                  </tr>
                ) : (
                  newsletters.map((nl) => (
                    <tr key={nl.id}>
                      <td>{nl.id}</td>
                      <td className="admin-table-title">{nl.title}</td>
                      <td>
                        <span className={`status-badge status-${nl.status || 'draft'}`}>
                          {statusLabel(nl.status)}
                        </span>
                      </td>
                      <td>{formatDate(nl.created_at)}</td>
                      <td>
                        <div className="admin-table-actions">
                          <Link
                            to={`/admin/newsletters/${nl.id}/edit`}
                            className="btn btn-outline btn-sm"
                          >
                            수정
                          </Link>
                          <button
                            className="btn btn-highlight btn-sm"
                            onClick={() => handleSend(nl.id)}
                          >
                            발송
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(nl.id)}
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};

export default AdminNewslettersPage;

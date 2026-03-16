import React, { useEffect, useState, useCallback } from 'react';
import {
  getSubscribers,
  createSubscriber,
  deleteSubscriber,
  exportSubscribers,
} from '../../api/subscribers';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import Pagination from '../../components/common/Pagination';
import { formatDate } from '../../utils/date';
import './AdminSubscribersPage.css';

interface Subscriber {
  id: number;
  email: string;
  createdAt: string;
  status?: string;
}

const AdminSubscribersPage: React.FC = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: { page: number; limit: number; keyword?: string } = { page, limit: 20 };
      if (keyword) params.keyword = keyword;
      const res = await getSubscribers(params);
      const data = res.data;
      const allSubscribers: Subscriber[] = Array.isArray(data) ? data : (data.subscribers || []);
      setSubscribers(allSubscribers);
      setTotalPages(Array.isArray(data) ? 1 : (data.totalPages || 1));
    } catch {
      setError('구독자를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setKeyword(searchInput);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    try {
      await createSubscriber(newEmail);
      setNewEmail('');
      fetchData();
    } catch {
      alert('구독자 추가에 실패했습니다.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteSubscriber(id);
      fetchData();
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportSubscribers();
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'subscribers.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('내보내기에 실패했습니다.');
    }
  };

  return (
    <div className="admin-subscribers">
      <div className="admin-page-header">
        <h1 className="admin-page-title">구독자 관리</h1>
        <button className="btn btn-outline" onClick={handleExport}>
          CSV 내보내기
        </button>
      </div>

      <div className="subscribers-toolbar">
        <form className="subscribers-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="이메일 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm">검색</button>
        </form>
        <form className="subscribers-add" onSubmit={handleAdd}>
          <input
            type="email"
            placeholder="새 구독자 이메일"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm">추가</button>
        </form>
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
                  <th>이메일</th>
                  <th>상태</th>
                  <th>가입일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="admin-table-empty">구독자가 없습니다.</td>
                  </tr>
                ) : (
                  subscribers.map((sub) => (
                    <tr key={sub.id}>
                      <td>{sub.id}</td>
                      <td>{sub.email}</td>
                      <td>
                        <span className={`status-badge status-${sub.status || 'active'}`}>
                          {sub.status === 'unsubscribed' ? '구독 취소' : sub.status === 'pending' ? '인증 대기' : '활성'}
                        </span>
                      </td>
                      <td>{formatDate(sub.createdAt)}</td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(sub.id)}
                        >
                          삭제
                        </button>
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

export default AdminSubscribersPage;

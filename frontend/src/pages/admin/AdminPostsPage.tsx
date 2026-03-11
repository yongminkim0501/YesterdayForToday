import React, { useEffect, useState, useCallback } from 'react';
import { getPosts, createPost, updatePost, deletePost, Post } from '../../api/posts';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import Pagination from '../../components/common/Pagination';
import './AdminPostsPage.css';

const COMPANIES = ['Meta', 'Netflix', 'Amazon', 'Google', 'Apple', 'Uber', 'LinkedIn', 'Spotify'];

interface PostForm {
  title: string;
  content: string;
  summary: string;
  source_url: string;
  company: string;
}

const emptyForm: PostForm = { title: '', content: '', summary: '', source_url: '', company: '' };

const AdminPostsPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PostForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getPosts({ page, limit: 10 });
      setPosts(res.data.posts || []);
      setTotal(res.data.totalPages || 1);
    } catch {
      setError('포스트를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (post: Post) => {
    setForm({
      title: post.title,
      content: post.content,
      summary: post.summary || '',
      source_url: post.source_url || '',
      company: post.company || '',
    });
    setEditingId(post.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deletePost(id);
      fetchPosts();
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) {
      alert('제목과 내용을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await updatePost(editingId, form);
      } else {
        await createPost(form);
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      fetchPosts();
    } catch {
      alert('저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR');
  };

  return (
    <div className="admin-posts">
      <div className="admin-page-header">
        <h1 className="admin-page-title">포스트 관리</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          새 포스트
        </button>
      </div>

      {showForm && (
        <div className="admin-form-overlay">
          <div className="admin-form-modal">
            <h2>{editingId ? '포스트 수정' : '새 포스트'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>제목</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="포스트 제목"
                />
              </div>
              <div className="form-group">
                <label>회사</label>
                <select
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                >
                  <option value="">선택하세요</option>
                  {COMPANIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>원문 URL</label>
                <input
                  type="url"
                  value={form.source_url}
                  onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="form-group">
                <label>요약</label>
                <textarea
                  rows={3}
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  placeholder="핵심 요약을 입력하세요"
                />
              </div>
              <div className="form-group">
                <label>내용 (Markdown)</label>
                <textarea
                  rows={12}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="마크다운으로 작성하세요"
                  className="markdown-editor"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>
                  취소
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchPosts} />
      ) : (
        <>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>제목</th>
                  <th>회사</th>
                  <th>작성일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {posts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="admin-table-empty">등록된 포스트가 없습니다.</td>
                  </tr>
                ) : (
                  posts.map((post) => (
                    <tr key={post.id}>
                      <td>{post.id}</td>
                      <td className="admin-table-title">{post.title}</td>
                      <td>
                        {post.company && <span className="badge">{post.company}</span>}
                      </td>
                      <td>{formatDate(post.created_at)}</td>
                      <td>
                        <div className="admin-table-actions">
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(post)}>
                            수정
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(post.id)}>
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
          <Pagination currentPage={page} totalPages={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};

export default AdminPostsPage;

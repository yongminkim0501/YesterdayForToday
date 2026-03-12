import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  getAdminNewsletter,
  createNewsletter,
  updateNewsletter,
  testSendNewsletter,
} from '../../api/newsletters';
import { getPosts, Post } from '../../api/posts';
import Loading from '../../components/common/Loading';
import './AdminNewsletterEditorPage.css';

const AdminNewsletterEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [selectedPostIds, setSelectedPostIds] = useState<number[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await getPosts({ limit: 100 });
        setPosts(res.data.posts || []);
      } catch {
        // silent
      }
    };
    fetchPosts();
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    const fetch = async () => {
      try {
        const res = await getAdminNewsletter(parseInt(id!, 10));
        const nl = res.data;
        setTitle(nl.title);
        setContent(nl.content);
        setSummary(nl.summary || '');
        setSelectedPostIds(nl.postIds || nl.post_ids || []);
      } catch {
        alert('뉴스레터를 불러오는 데 실패했습니다.');
        navigate('/admin/newsletters');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id, isEdit, navigate]);

  const togglePost = (postId: number) => {
    setSelectedPostIds((prev) =>
      prev.includes(postId) ? prev.filter((p) => p !== postId) : [...prev, postId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
      alert('제목과 내용을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const data = { title, content, summary, postIds: selectedPostIds };
      if (isEdit) {
        await updateNewsletter(parseInt(id!, 10), data);
      } else {
        await createNewsletter(data);
      }
      navigate('/admin/newsletters');
    } catch {
      alert('저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestSend = async () => {
    if (!isEdit) {
      alert('먼저 뉴스레터를 저장해 주세요.');
      return;
    }
    try {
      await testSendNewsletter(parseInt(id!, 10));
      alert('테스트 발송이 완료되었습니다.');
    } catch {
      alert('테스트 발송에 실패했습니다.');
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="newsletter-editor">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          {isEdit ? '뉴스레터 수정' : '새 뉴스레터'}
        </h1>
        <div className="editor-header-actions">
          <button
            className="btn btn-outline"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? '편집' : '미리보기'}
          </button>
          {isEdit && (
            <button className="btn btn-outline" onClick={handleTestSend}>
              테스트 발송
            </button>
          )}
        </div>
      </div>

      <div className="editor-layout">
        <form className="editor-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="뉴스레터 제목"
            />
          </div>
          <div className="form-group">
            <label>요약</label>
            <textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="뉴스레터 요약"
            />
          </div>

          {!showPreview ? (
            <div className="form-group">
              <label>내용 (Markdown)</label>
              <textarea
                rows={20}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="마크다운으로 작성하세요"
                className="markdown-editor"
              />
            </div>
          ) : (
            <div className="editor-preview">
              <label>미리보기</label>
              <div className="editor-preview-content markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content || '*내용을 입력하세요*'}
                </ReactMarkdown>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>포스트 선택</label>
            <div className="post-selector">
              {posts.length === 0 ? (
                <p className="post-selector-empty">등록된 포스트가 없습니다.</p>
              ) : (
                posts.map((post) => (
                  <label key={post.id} className="post-selector-item">
                    <input
                      type="checkbox"
                      checked={selectedPostIds.includes(post.id)}
                      onChange={() => togglePost(post.id)}
                    />
                    <span className="post-selector-title">{post.title}</span>
                    {post.company && (
                      <span className="badge" style={{ marginLeft: 8 }}>{post.company}</span>
                    )}
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/admin/newsletters')}
            >
              취소
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminNewsletterEditorPage;

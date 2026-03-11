import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-inner container">
        <div className="footer-top">
          <div className="footer-brand">
            <h3 className="footer-logo">오늘을 만들었던 어제의 기술</h3>
            <p className="footer-desc">
              빅테크 엔지니어링 블로그의 핵심을 매일 아침 요약해 드립니다.
            </p>
          </div>
          <div className="footer-links">
            <Link to="/">홈</Link>
            <Link to="/archive">아카이브</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} 오늘을 만들었던 어제의 기술. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

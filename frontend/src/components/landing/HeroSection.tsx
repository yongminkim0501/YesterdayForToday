import React from 'react';
import './HeroSection.css';

interface HeroSectionProps {
  onCTAClick: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onCTAClick }) => {
  return (
    <section className="hero">
      <div className="hero-inner container">
        <h1 className="hero-title">
          빅테크의 기술 블로그,<br />
          매일 아침 6시에 요약해 드립니다
        </h1>
        <p className="hero-subtitle">
          Meta, Netflix, Amazon 등 세계 최고 엔지니어링 팀의 기술 블로그를<br />
          핵심만 골라 한국어로 요약해 매일 아침 이메일로 보내드립니다.
        </p>
        <button className="btn btn-highlight btn-lg" onClick={onCTAClick}>
          무료로 구독하기
        </button>
      </div>
    </section>
  );
};

export default HeroSection;

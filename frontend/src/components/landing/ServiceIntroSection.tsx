import React from 'react';
import './ServiceIntroSection.css';

const features = [
  {
    icon: '🌅',
    title: '매일 오전 6시 발송',
    description: '출근길에 읽기 좋은 시간에 맞춰 매일 아침 뉴스레터를 보내드립니다.',
  },
  {
    icon: '📝',
    title: '원문의 20% 핵심 요약',
    description: '긴 영어 블로그 글을 핵심만 추려 한국어로 간결하게 요약합니다.',
  },
  {
    icon: '🏢',
    title: '빅테크 엔지니어링 블로그',
    description: 'Meta, Netflix, Amazon, Google 등 최고의 엔지니어링 팀의 인사이트를 전합니다.',
  },
];

const ServiceIntroSection: React.FC = () => {
  return (
    <section className="service-intro">
      <div className="container">
        <h2 className="section-title">왜 구독해야 할까요?</h2>
        <div className="feature-cards">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <span className="feature-icon">{feature.icon}</span>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-desc">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServiceIntroSection;

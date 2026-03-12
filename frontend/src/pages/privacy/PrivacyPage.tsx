import React from 'react';
import './PrivacyPage.css';

const PrivacyPage: React.FC = () => {
  return (
    <div className="privacy-page">
      <div className="container">
        <div className="privacy-content">
          <h1>개인정보처리방침</h1>
          <p className="privacy-updated">최종 수정일: 2026년 3월 12일</p>

          <section>
            <h2>1. 수집하는 개인정보</h2>
            <p>
              「오늘을 만들었던 어제의 기술」(이하 "서비스")은 뉴스레터 발송을 위해
              아래의 개인정보를 수집합니다.
            </p>
            <ul>
              <li><strong>수집 항목</strong>: 이메일 주소</li>
              <li><strong>수집 방법</strong>: 웹사이트 구독 신청 폼</li>
            </ul>
          </section>

          <section>
            <h2>2. 개인정보의 수집 및 이용 목적</h2>
            <ul>
              <li>뉴스레터 발송 (빅테크 기술 블로그 요약 콘텐츠)</li>
              <li>구독 인증 이메일 발송</li>
              <li>서비스 관련 공지사항 전달</li>
            </ul>
          </section>

          <section>
            <h2>3. 개인정보의 보유 및 이용 기간</h2>
            <p>
              수집된 개인정보는 <strong>구독 해지 시까지</strong> 보유합니다.
              구독을 해지하시면 해당 이메일 주소는 비활성 처리되며,
              이후 뉴스레터가 발송되지 않습니다.
            </p>
          </section>

          <section>
            <h2>4. 개인정보의 제3자 제공</h2>
            <p>
              서비스는 이용자의 개인정보를 제3자에게 제공하지 않습니다.
              다만, 아래의 경우는 예외로 합니다.
            </p>
            <ul>
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령의 규정에 의한 경우</li>
            </ul>
          </section>

          <section>
            <h2>5. 개인정보 처리 위탁</h2>
            <p>서비스는 뉴스레터 발송을 위해 아래와 같이 업무를 위탁하고 있습니다.</p>
            <ul>
              <li><strong>수탁 업체</strong>: 이메일 발송 서비스 (SMTP)</li>
              <li><strong>위탁 업무</strong>: 이메일 발송</li>
            </ul>
          </section>

          <section>
            <h2>6. 이용자의 권리</h2>
            <p>이용자는 언제든지 아래의 권리를 행사할 수 있습니다.</p>
            <ul>
              <li><strong>구독 해지</strong>: 이메일 하단의 "구독 해지" 링크를 통해 즉시 해지 가능</li>
              <li><strong>개인정보 삭제 요청</strong>: 아래 연락처로 요청 시 지체 없이 삭제</li>
            </ul>
          </section>

          <section>
            <h2>7. 개인정보의 안전성 확보 조치</h2>
            <ul>
              <li>구독자 식별 토큰은 UUID v4로 생성하여 추측 불가</li>
              <li>관리자 비밀번호는 bcrypt로 암호화 저장</li>
              <li>API Rate Limiting 적용으로 무차별 공격 방지</li>
              <li>HTTPS 통신 (배포 시 적용)</li>
            </ul>
          </section>

          <section>
            <h2>8. 개인정보 보호책임자</h2>
            <ul>
              <li><strong>이메일</strong>: yongmingim166@gmail.com</li>
            </ul>
          </section>

          <section>
            <h2>9. 방침 변경</h2>
            <p>
              본 개인정보처리방침이 변경되는 경우, 변경 사항을 웹사이트에 공지합니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;

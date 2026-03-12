import React, { useRef } from 'react';
import HeroSection from '../../components/landing/HeroSection';
import ServiceIntroSection from '../../components/landing/ServiceIntroSection';
import SubscriptionForm from '../../components/landing/SubscriptionForm';
const LandingPage: React.FC = () => {
  const subscriptionRef = useRef<HTMLDivElement>(null);

  const scrollToSubscription = () => {
    subscriptionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <HeroSection onCTAClick={scrollToSubscription} />
      <ServiceIntroSection />
      <SubscriptionForm ref={subscriptionRef} />
    </>
  );
};

export default LandingPage;

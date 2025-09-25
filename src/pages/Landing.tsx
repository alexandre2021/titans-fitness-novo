import LandingHeader from "@/components/landing/LandingHeader";
import LandingFooter from "@/components/landing/LandingFooter";
import CommunityFeedSection from "@/components/landing/CommunityFeedSection";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <CommunityFeedSection />
      </main>
      <LandingFooter />
    </div>
  );
};

export default Landing;
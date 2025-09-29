import LandingHeader from "@/components/landing/LandingHeader";
import LandingFooter from "@/components/landing/LandingFooter";
import BlogFeedSection from "@/components/landing/BlogFeedSection";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <BlogFeedSection />
      </main>
      <LandingFooter />
    </div>
  );
};

export default Landing;
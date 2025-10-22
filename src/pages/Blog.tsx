import LandingHeader from "@/components/landing/LandingHeader";
import LandingFooter from "@/components/landing/LandingFooter";
import BlogFeedSection from "@/components/landing/BlogFeedSection";

const Blog = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter">
                Explore nosso Conteúdo
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Artigos, dicas e novidades sobre treino, nutrição e bem-estar.
              </p>
            </div>
            <div className="max-w-5xl mx-auto">
              <BlogFeedSection />
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
};

export default Blog;
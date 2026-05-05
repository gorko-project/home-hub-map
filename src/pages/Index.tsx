import { Navbar } from "@/components/Navbar";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-16">
        <h1 className="text-4xl font-bold tracking-tight">ApartmentMap</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Find honest reviews for apartment buildings on a map. Coming soon.
        </p>
        <div className="mt-10 flex h-[60vh] items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
          Map will render here
        </div>
      </main>
    </div>
  );
};

export default Index;

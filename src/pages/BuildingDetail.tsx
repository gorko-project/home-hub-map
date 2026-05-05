import { useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";

const BuildingDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-12">
        <h1 className="text-3xl font-bold tracking-tight">Building: {slug}</h1>
        <p className="mt-2 text-muted-foreground">
          Detail page scaffold. Scores, photos, and map will appear here.
        </p>
      </main>
    </div>
  );
};

export default BuildingDetail;

import { Navbar } from "@/components/Navbar";

const Admin = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="container py-12">
      <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
      <p className="mt-2 text-muted-foreground">
        Manage buildings, scores, and publish status. (Scaffold only.)
      </p>
    </main>
  </div>
);

export default Admin;

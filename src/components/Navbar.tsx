import { Link } from "react-router-dom";

export const Navbar = () => (
  <header className="border-b border-border bg-background">
    <nav className="container flex h-14 items-center justify-between">
      <Link to="/" className="font-semibold tracking-tight">
        ApartmentMap
      </Link>
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Map</Link>
        <Link to="/admin" className="hover:text-foreground">Admin</Link>
      </div>
    </nav>
  </header>
);

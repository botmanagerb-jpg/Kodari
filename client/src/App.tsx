import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-8 text-center">
          <h1 className="text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            KODARI
          </h1>
          <p className="text-xl text-muted-foreground font-medium">
            Le gestionnaire de bots Discord ultime. Rapide, sécurisé et puissant.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            <div className="p-8 rounded-2xl bg-card border border-border/40 shadow-2xl backdrop-blur-md hover:border-primary/30 transition-colors">
              <h3 className="text-xl font-bold mb-3">Multi-Bots</h3>
              <p className="text-muted-foreground">Gérez toutes vos instances depuis une interface unique.</p>
            </div>
            <div className="p-8 rounded-2xl bg-card border border-border/40 shadow-2xl backdrop-blur-md hover:border-primary/30 transition-colors">
              <h3 className="text-xl font-bold mb-3">Sécurité KODARI</h3>
              <p className="text-muted-foreground">Blacklist globale et protection avancée contre les raids.</p>
            </div>
          </div>
        </div>
      </div>
      <Toaster />
      <Router />
    </QueryClientProvider>
  );
}

export default App;

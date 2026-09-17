import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import { I18nProvider } from "./contexts/I18nContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Report from "./pages/Report";
import Reports from "./pages/Reports";
import Scan from "./pages/Scan";
import Settings from "./pages/Settings";
import Verify from "./pages/Verify";
import BorderCheckpoint from "./pages/BorderCheckpoint";

import { useAuth } from "./_core/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";

function WorkspaceRoute({ children, allowGuest = true }: { children: React.ReactNode; allowGuest?: boolean }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user && !allowGuest) {
      setLocation("/auth/login");
    }
  }, [user, loading, allowGuest, setLocation]);

  return <DashboardLayout allowGuest={allowGuest}>{children}</DashboardLayout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={BorderCheckpoint} />
      <Route path="/home" component={Home} />
      <Route path="/auth/login" component={Auth} />
      <Route path="/auth/register" component={Auth} />
      <Route path="/auth/signup" component={Auth} />
      <Route path="/register" component={Auth} />
      <Route path="/signup" component={Auth} />
      <Route path="/auth" component={Auth} />
      <Route path="/login" component={Auth} />
      <Route path="/auth/:mode" component={Auth} />
      <Route path="/dashboard"><WorkspaceRoute><Dashboard /></WorkspaceRoute></Route>
      <Route path="/verify"><WorkspaceRoute><Verify /></WorkspaceRoute></Route>
      <Route path="/reports"><WorkspaceRoute><Reports /></WorkspaceRoute></Route>
      <Route path="/history"><WorkspaceRoute><History /></WorkspaceRoute></Route>
      <Route path="/settings"><WorkspaceRoute><Settings /></WorkspaceRoute></Route>
      <Route path="/scan/:id"><WorkspaceRoute><Scan /></WorkspaceRoute></Route>
      <Route path="/report/:id"><WorkspaceRoute><Report /></WorkspaceRoute></Route>
      <Route path="/border" component={BorderCheckpoint} />
      <Route path="/border-checkpoint" component={BorderCheckpoint} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}

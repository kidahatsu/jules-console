import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Sessions = lazy(() => import("./pages/Sessions"));
const SessionDetails = lazy(() => import("./pages/SessionDetails"));
const Repositories = lazy(() => import("./pages/Repositories"));
const StarredRepos = lazy(() => import("./pages/StarredRepos"));
const HuggingFace = lazy(() => import("./pages/HuggingFace"));
const Inbox = lazy(() => import("./pages/Inbox"));

const LoadingFallback = () => (
  <div className="flex h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/sessions/:id" element={<SessionDetails />} />
              <Route path="/repos" element={<Repositories />} />
              <Route path="/starred" element={<StarredRepos />} />
              <Route path="/huggingface" element={<HuggingFace />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="*" element={<div className="p-8 text-white">404: Not Found</div>} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

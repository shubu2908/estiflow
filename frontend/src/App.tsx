import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Dashboard } from "@/pages/Dashboard";
import { NewProject } from "@/pages/NewProject";
import { UploadGenerate } from "@/pages/UploadGenerate";
import { EstimateWorkspace } from "@/pages/EstimateWorkspace";

function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects/new" element={<NewProject />} />
          <Route path="/projects/:id/upload" element={<UploadGenerate />} />
          <Route path="/projects/:id" element={<EstimateWorkspace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;

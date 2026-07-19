import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Landing from "./pages/Landing";
import Configure from "./pages/Configure";
import Processing from "./pages/Processing";
import Select from "./pages/Select";
import Export from "./pages/Export";
import History from "./pages/History";

export default function App() {
  return (
    <div className="min-h-screen bg-bg text-text-primary">
      <Header />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/configure" element={<Configure />} />
        <Route path="/processing" element={<Processing />} />
        <Route path="/select" element={<Select />} />
        <Route path="/export" element={<Export />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </div>
  );
}

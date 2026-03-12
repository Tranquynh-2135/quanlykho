import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products/Products";
// import Import from "./pages/Import";
// import Export from "./pages/Export";
// import Reports from "./pages/Reports";

function App() {
  return (
    <Router>
      <div className="d-flex" style={{ minHeight: "100vh" }}>
        {}
        <Sidebar />

        {}
        <div
          className="flex-grow-1 bg-light p-4"
          style={{ marginLeft: "260px" }}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            {/* <Route path="/import" element={<Import />} />
            <Route path="/export" element={<Export />} />
            <Route path="/reports" element={<Reports />} /> */}
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;

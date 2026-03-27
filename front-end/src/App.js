import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products/Products";
import Import from "./pages/Import/Import";
import Suppliers  from "./pages/Suppliers/Suppliers";
import Warehouses from "./pages/Warehouses/Warehouses";
import Users from "./pages/Users/Users";

function App() {
  return (
    <Router>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />

        {/* Content — marginLeft = width sidebar thu nhỏ */}
        <div style={{
          marginLeft: "68px",          /* bằng width sidebar thu nhỏ */
          flex: 1,
          background: "#f4f6fb",
          minHeight: "100vh",
          transition: "margin-left 0.25s ease",  /* mượt khi sidebar mở */
        }}>
          <Routes>
            <Route path="/"         element={<Dashboard />} />
            <Route path="/products" element={<Products />}  />
            <Route path="/import"   element={<Import />}    />
            <Route path="/suppliers"  element={<Suppliers />}  />
            <Route path="/warehouses" element={<Warehouses />} />
            <Route path="/users" element={<Users />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
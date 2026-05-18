import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Sidebar from "./components/Sidebar";
import Login from "./pages/Login/Login";

import Dashboard from "./pages/Dashboard/Dashboard";
import Products from "./pages/Products/Products";
import Import from "./pages/Import/Import";
import Export from "./pages/Export/Export";
import Suppliers from "./pages/Suppliers/Suppliers";
import Warehouses from "./pages/Warehouses/Warehouses";
import Categories from "./pages/Categories/Categories";
import Users from "./pages/Users/Users";
import TopBar from "./components/TopBar";
import Inventory from "./pages/Inventory/Inventory"; // sẽ tạo sau

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/*"
            element={
              <ProtectedLayout>
                <Routes>
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute pageKey="dashboard">
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/products"
                    element={
                      <ProtectedRoute pageKey="products">
                        <Products />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/import"
                    element={
                      <ProtectedRoute pageKey="import">
                        <Import />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/export"
                    element={
                      <ProtectedRoute pageKey="export">
                        <Export />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/suppliers"
                    element={
                      <ProtectedRoute pageKey="suppliers">
                        <Suppliers />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/warehouses"
                    element={
                      <ProtectedRoute pageKey="warehouses">
                        <Warehouses />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/categories"
                    element={
                      <ProtectedRoute pageKey="categories">
                        <Categories />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/users"
                    element={
                      <ProtectedRoute pageKey="users">
                        <Users />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/inventory"
                    element={
                      <ProtectedRoute pageKey="inventory">
                        <Inventory />
                      </ProtectedRoute>
                    }
                  />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ProtectedLayout>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

// Layout có Sidebar
const ProtectedLayout = ({ children }) => {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />

      <div
        style={{
          marginLeft: "68px",
          flex: 1,
          background: "#f4f6fb",
          minHeight: "100vh",
        }}
      >
        <TopBar /> {/* ← Thêm dòng này */}
        <div style={{ paddingTop: "64px" }}>
          {" "}
          {/* Đẩy nội dung xuống dưới TopBar */}
          {children}
        </div>
      </div>
    </div>
  );
};

export default App;

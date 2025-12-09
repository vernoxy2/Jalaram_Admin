import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Components/Home";
import MaterialList from "./Pages/MaterialList/MaterialList";
import AddMaterial from "./Pages/MaterialList/AddMaterial";
import JobCard from "./Pages/JobCard/JobCard";
import AddJob from "./Pages/JobCard/AddJob";
import AdminLayout from "./Components/Layout/AdminLayout";
import Dashboard from "./Pages/Dashboard";
import MaterialIssueForm from "./Pages/Issue Material/MaterialIssueForm";
import MaterialIssueRequestList from "./Pages/Issue Material/MaterialIssueRequestList";
import Stock from "./Pages/StockDetail/Stock";
import AdminJobDetailsScreen from "./Pages/JobCard/JobDetailScreen";
import JobDetailsScreen from "./Pages/JobCard/JobDetailScreen";

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Layout Route */}
        <Route path="/" element={<AdminLayout />}>
          {/* Nested Routes */}
          <Route index element={<Dashboard />} />
          <Route path="home" element={<Home />} />

          {/* JobCard Routes */}
          <Route path="jobcard">
            <Route index element={<JobCard />} />
            <Route path="addjob" element={<AddJob />} />
            <Route path="edit/:id" element={<AddJob />} />
            <Route path="detail/:id" element={<JobDetailsScreen/>} />
          </Route>

          {/* Material Routes */}
          <Route path="material_in">
            <Route index element={<MaterialList />} />
            <Route path="add_material" element={<AddMaterial />} />
            <Route path="edit/:id" element={<AddMaterial />} />
          </Route>

          {/* Material Issue */}
          <Route path="issue_material">
            <Route index element={<MaterialIssueRequestList />} />
            <Route path=":id" element={<MaterialIssueForm />} />
          </Route>

          {/* Dispatch */}
          <Route path="dispatch" element={<Dashboard />} />

          {/* Total Inventory */}
          <Route path="total_inventory" element={<Dashboard />} />

          {/* Stock */}
          <Route path="stock" element={<Stock />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
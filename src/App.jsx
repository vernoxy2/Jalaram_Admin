import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Components/Home";
import MaterialList from "./Pages/MaterialList/MaterialList";
import AddMaterial from "./Pages/MaterialList/AddMaterial";
import JobCard from "./Pages/JobCard/JobCard";
import AddJob from "./Pages/JobCard/AddJob";
import JobDetailScreen from "./Components/JobDetailScreen";
import AdminLayout from "./Components/Layout/AdminLayout";
import Dashboard from "./Pages/Dashboard";
import MaterialIssueForm from "./Pages/Issue Material/MaterialIssueForm";
import MaterialIssueRequestList from "./Pages/Issue Material/MaterialIssueRequestList";

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
            <Route path="detail/:id" element={<JobDetailScreen />} />
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
            <Route path=":rollId" element={<MaterialIssueForm />} />
          </Route>

          {/* Dispatch */}
          <Route path="dispatch" element={<Dashboard />} />

          {/* Total Inventory */}
          <Route path="total_inventory" element={<Dashboard />} />

          {/* Stock */}
          <Route path="stock" element={<Dashboard />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;

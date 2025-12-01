import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Form,
} from "react-router-dom";
import Home from "./Components/Home";
import MaterialList from "./Components/MaterialList";
import AddMateriall from "./Components/AddMaterial";
import JobCard from "./Components/JobCard";
import AddJob from "./Components/AddJob";
import JobDetailScreen from "./Components/JobDetailScreen";
import AdminLayout from "./Components/Layout/AdminLayout";
import Dashboard from "./Pages/Dashboard";

const App = () => {
  return (
    <Router>
      
      <AdminLayout >
        <Dashboard/>
      </AdminLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/material" element={<MaterialList />} />
        <Route path="/addmaterial" element={<AddMateriall />} />
        <Route path="/material/edit/:id" element={<AddMateriall />} />
        <Route path="/jobcard" element={<JobCard /> } />
        <Route path="/addjob" element={<AddJob /> } />
        <Route path="/addjob/:id" element={<AddJob /> } />
        <Route path="/jobDetailScreen/:id" element={<JobDetailScreen /> } />

      </Routes>
    </Router>
  );
};

export default App;

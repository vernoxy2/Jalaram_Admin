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
import Sidebar from "./Components/SideBar";
import JobCard from "./Components/JobCard";
import AddJob from "./Components/AddJob";
import JobDetailScreen from "./Components/JobDetailScreen";
import MaterialIssueRequestList from "./Components/MaterialIssueRequestList";
import MaterialIssueForm from "./Components/MaterialIssueForm";

const App = () => {
  return (
    <Router>
      <Sidebar/>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/material" element={<MaterialList />} />
        <Route path="/addmaterial" element={<AddMateriall />} />
        <Route path="/material/edit/:id" element={<AddMateriall />} />
        <Route path="/jobcard" element={<JobCard /> } />
        <Route path="/addjob" element={<AddJob /> } />
        <Route path="/addjob/:id" element={<AddJob /> } />
        <Route path="/jobDetailScreen/:id" element={<JobDetailScreen /> } />
        <Route path="/materialIssueRequestList" element={<MaterialIssueRequestList />} />
        <Route path="/materialIssueForm/:id" element={<MaterialIssueForm />} />

      </Routes>
    </Router>
  );
};

export default App;

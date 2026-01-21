import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./page/HomePage.jsx";
import Resume from "./page/Resume.jsx";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/resume" element={<Resume />} />
            </Routes>
        </BrowserRouter>
    );
}

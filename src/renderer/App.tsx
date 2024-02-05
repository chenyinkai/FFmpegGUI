import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import FFmpeg from './ffmpeg/FFmpeg';
import Custom from './ffmpeg/Custom';
import Watermark from './ffmpeg/Watermark';
import Home from './Home';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/watermark" element={<Watermark />} />
        <Route path="/convert/mp4" element={<FFmpeg />} />
        <Route path="/convert/custom" element={<Custom />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}

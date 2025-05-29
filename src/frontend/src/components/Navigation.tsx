import React from 'react';
import './Navigation.css';

const Navigation: React.FC = () => {
  return (
    <nav className="nav">
      <div className="nav-brand">
        <h1>GTFS Boss</h1>
      </div>
      <div className="nav-menu">
        <a href="#" className="nav-item">Home</a>
        <a href="#" className="nav-item">Documentation</a>
        <a href="#" className="nav-item">About</a>
      </div>
    </nav>
  );
};

export default Navigation; 
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Header.module.css';

const Header: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <Link to="/" className={styles.brandLink}>
            AI Planning Assistant
          </Link>
        </div>
        
        <nav className={styles.nav}>
          <Link 
            to="/" 
            className={`${styles.navLink} ${isActive('/') ? styles.active : ''}`}
          >
            Plans
          </Link>
          <Link 
            to="/chat" 
            className={`${styles.navLink} ${isActive('/chat') ? styles.active : ''}`}
          >
            Chat
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
import React from 'react';
import styles from './ChatPage.module.css';

const ChatPage: React.FC = () => {
  return (
    <div className={styles.chatPage}>
      <div className={styles.header}>
        <h1>AI Chat Assistant</h1>
        <p>Get contextual help with your plans</p>
      </div>
      
      <div className={styles.content}>
        {/* Placeholder for future ContextualChat component */}
        <div className={styles.placeholder}>
          <p>Contextual chat interface will be implemented in future tasks</p>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
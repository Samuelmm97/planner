import React, { useState, useCallback, useRef, useEffect } from 'react';
import { NaturalLanguageContent } from '../types';
import styles from './NaturalLanguageInput.module.css';

export interface NaturalLanguageInputProps {
  onSubmit: (content: NaturalLanguageContent) => void;
  onAutoSave?: (content: string) => void;
  placeholder?: string;
  maxLength?: number;
  autoSaveDelay?: number;
  disabled?: boolean;
  initialValue?: string;
  showVoiceInput?: boolean;
  isProcessing?: boolean;
}

export const NaturalLanguageInput: React.FC<NaturalLanguageInputProps> = ({
  onSubmit,
  onAutoSave,
  placeholder = "Describe your plan in natural language...",
  maxLength = 5000,
  autoSaveDelay = 1000,
  disabled = false,
  initialValue = '',
  showVoiceInput = true,
  isProcessing = false,
}) => {
  const [text, setText] = useState(initialValue);
  const [isListening, setIsListening] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Initialize speech recognition if supported
  useEffect(() => {
    if (showVoiceInput && (window.webkitSpeechRecognition || window.SpeechRecognition)) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setText(prev => prev + finalTranscript);
          setHasUnsavedChanges(true);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [showVoiceInput]);

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges && onAutoSave) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        onAutoSave(text);
        setHasUnsavedChanges(false);
      }, autoSaveDelay);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [text, hasUnsavedChanges, onAutoSave, autoSaveDelay]);

  // Validation
  const validateInput = useCallback((value: string): string | null => {
    if (value.length > maxLength) {
      return `Input exceeds maximum length of ${maxLength} characters`;
    }
    if (value.trim().length === 0) {
      return 'Please enter some text to create a plan';
    }
    return null;
  }, [maxLength]);

  const handleTextChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = event.target.value;
    setText(newText);
    setHasUnsavedChanges(true);
    
    const error = validateInput(newText);
    setValidationError(error);
  }, [validateInput]);

  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    
    const error = validateInput(text);
    if (error) {
      setValidationError(error);
      return;
    }

    const content: NaturalLanguageContent = {
      originalText: text.trim(),
    };

    onSubmit(content);
    setText('');
    setHasUnsavedChanges(false);
    setValidationError(null);
  }, [text, validateInput, onSubmit]);

  const handleVoiceToggle = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSubmit(event as any);
    }
  }, [handleSubmit]);

  const characterCount = text.length;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isOverLimit = characterCount > maxLength;

  return (
    <form onSubmit={handleSubmit} className={styles.container}>
      <div className={styles.inputWrapper}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isProcessing}
          className={`${styles.textarea} ${validationError ? styles.error : ''} ${isProcessing ? styles.processing : ''}`}
          rows={4}
          aria-label="Natural language plan input"
          aria-describedby={validationError ? 'input-error' : undefined}
        />
        
        {showVoiceInput && (window.webkitSpeechRecognition || window.SpeechRecognition) && (
          <button
            type="button"
            onClick={handleVoiceToggle}
            disabled={disabled || isProcessing}
            className={`${styles.voiceButton} ${isListening ? styles.listening : ''}`}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
            title={isListening ? 'Stop voice input' : 'Start voice input'}
          >
            {isListening ? '🎤' : '🎙️'}
          </button>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.status}>
          {isProcessing && (
            <span className={styles.processingIndicator}>
              <span className={styles.spinner}></span>
              Processing...
            </span>
          )}
          
          {hasUnsavedChanges && !isProcessing && (
            <span className={styles.autoSaveIndicator}>
              Auto-saving...
            </span>
          )}
          
          {isListening && (
            <span className={styles.listeningIndicator}>
              🎤 Listening...
            </span>
          )}
        </div>

        <div className={styles.actions}>
          <div className={`${styles.characterCount} ${isNearLimit ? styles.warning : ''} ${isOverLimit ? styles.error : ''}`}>
            {characterCount}/{maxLength}
          </div>
          
          <button
            type="submit"
            disabled={disabled || isProcessing || !!validationError || text.trim().length === 0}
            className={styles.submitButton}
          >
            {isProcessing ? 'Processing...' : 'Create Plan'}
          </button>
        </div>
      </div>

      {validationError && (
        <div id="input-error" className={styles.errorMessage} role="alert">
          {validationError}
        </div>
      )}
    </form>
  );
};

export default NaturalLanguageInput;
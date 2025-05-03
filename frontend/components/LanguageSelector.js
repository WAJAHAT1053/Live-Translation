import { useState } from 'react';
import { languages } from '@/utils/languages';

export default function LanguageSelector({ 
  sourceLanguage, 
  targetLanguage, 
  onSourceLanguageChange, 
  onTargetLanguageChange 
}) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-center space-y-2 md:space-y-0 md:space-x-4">
      <div className="flex items-center space-x-2">
        <label htmlFor="source-language-select" className="text-sm font-medium text-white">
          I speak:
        </label>
        <select
          id="source-language-select"
          value={sourceLanguage}
          onChange={(e) => onSourceLanguageChange(e.target.value)}
          className="bg-gray-700 text-white rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>
      
      <div className="flex items-center space-x-2">
        <label htmlFor="target-language-select" className="text-sm font-medium text-white">
          Translate audio to:
        </label>
        <select
          id="target-language-select"
          value={targetLanguage}
          onChange={(e) => onTargetLanguageChange(e.target.value)}
          className="bg-gray-700 text-white rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
} 
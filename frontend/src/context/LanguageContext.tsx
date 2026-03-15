import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'vi' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  vi: {
    'welcome.title': 'Xin chào, {name}',
    'welcome.subtitle': 'Hôm nay tôi có thể giúp gì cho bạn?',
    'chat.newChat': 'New chat',
    'chat.input.placeholder': 'Type your question...',
    'chat.send': 'Gửi',
    'chat.thinking': 'Đang suy nghĩ...',
    'sidebar.recent': 'Recent',
    'sidebar.noChats': 'Chưa có cuộc trò chuyện nào',
    'sidebar.settings': 'Cài đặt',
    'sidebar.help': 'Hỗ trợ',
    'sidebar.logout': 'Đăng xuất',
    'profile.title': 'Hồ sơ cá nhân',
    'profile.preferences': 'Cài đặt ưu tiên',
    'profile.language': 'Ngôn ngữ',
    'profile.theme': 'Giao diện',
    'profile.model': 'AI Model',
    'profile.save': 'Save Changes',
    'profile.saving': 'Đang lưu...',
    'profile.saved': 'Đã lưu thành công',
  },
  en: {
    'welcome.title': 'Hello, {name}',
    'welcome.subtitle': 'How can I help you today?',
    'chat.newChat': 'New chat',
    'chat.input.placeholder': 'Type your question...',
    'chat.send': 'Send',
    'chat.thinking': 'Thinking...',
    'sidebar.recent': 'Recent',
    'sidebar.noChats': 'No conversations yet',
    'sidebar.settings': 'Settings',
    'sidebar.help': 'Help',
    'sidebar.logout': 'Logout',
    'profile.title': 'Profile',
    'profile.preferences': 'Preferences',
    'profile.language': 'Language',
    'profile.theme': 'Theme',
    'profile.model': 'AI Model',
    'profile.save': 'Save Changes',
    'profile.saving': 'Saving...',
    'profile.saved': 'Saved successfully',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('language') as Language) || 'vi';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};

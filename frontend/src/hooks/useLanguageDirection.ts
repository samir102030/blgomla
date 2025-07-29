import { useUserStore } from '../stores/user.store';

export const useLanguageDirection = () => {
  const lang = useUserStore(state => state.lang);
  
  const isRTL = lang === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';
  
  return {
    isRTL,
    dir,
    lang
  };
}; 